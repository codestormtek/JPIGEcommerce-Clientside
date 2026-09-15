/**
 * apiClient.js
 * Thin fetch wrapper for the JPIG API.
 * - All requests go to /api/v1/... (Vite proxies them to http://localhost:4000)
 * - Automatically attaches the Bearer token from localStorage
 * - On 401, attempts one silent token refresh then retries
 * - Throws a plain Error with the server's error message on failure
 */

const BASE = import.meta.env?.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1`
  : '/api/v1';

// ─── Token helpers ─────────────────────────────────────────────────────────────

// Keep a small generation counter in addition to comparing the token value.  A
// request can be in flight while another request refreshes the session, so the
// response's 401 must be associated with the credentials that request actually
// sent, not just with whatever is in localStorage when the response arrives.
let accessTokenGeneration = 0;
let observedAccessToken;
let hasObservedAccessToken = false;

function readAccessToken() {
  const token = localStorage.getItem('accessToken');
  if (!hasObservedAccessToken) {
    observedAccessToken = token;
    hasObservedAccessToken = true;
  } else if (token !== observedAccessToken) {
    observedAccessToken = token;
    accessTokenGeneration += 1;
  }
  return token;
}

function writeAccessToken(token) {
  const currentToken = readAccessToken();
  if (token) {
    if (token !== currentToken) localStorage.setItem('accessToken', token);
    observedAccessToken = token;
    accessTokenGeneration += 1;
  }
}

export function getAccessToken()  { return readAccessToken(); }
export function getRefreshToken() { return localStorage.getItem('refreshToken'); }

export function saveTokens({ accessToken, refreshToken }) {
  if (accessToken)  writeAccessToken(accessToken);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens() {
  const token = readAccessToken();
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('authUser');
  if (token) {
    observedAccessToken = null;
    accessTokenGeneration += 1;
  }
}

// ─── Core fetch ────────────────────────────────────────────────────────────────

function getTokenSnapshot() {
  return {
    token: getAccessToken(),
    generation: accessTokenGeneration,
  };
}

function hasNewAccessToken(snapshot) {
  const token = getAccessToken();
  return Boolean(token) && (
    token !== snapshot.token ||
    accessTokenGeneration !== snapshot.generation
  );
}

// ─── Silent refresh ────────────────────────────────────────────────────────────

// A refresh is shared by every request type.  Refresh-token rotation means
// there must never be more than one refresh request in flight for this module.
let refreshPromise = null;

function tryRefresh(snapshot) {
  // Another request may have completed its refresh between receiving the 401
  // and getting here.  Treat that as a successful refresh instead of rotating
  // the new one-use refresh token a second time.
  if (hasNewAccessToken(snapshot)) return Promise.resolve(true);
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.resolve(false);

  const currentRefreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      saveTokens({ accessToken: data?.data?.accessToken, refreshToken: data?.data?.refreshToken });
      return true;
    } catch {
      return false;
    }
  })();

  refreshPromise = currentRefreshPromise;
  // Clear only this generation of the promise.  This also prevents a
  // completed refresh from being reused forever.
  currentRefreshPromise.then(
    () => {
      if (refreshPromise === currentRefreshPromise) refreshPromise = null;
    },
    () => {
      if (refreshPromise === currentRefreshPromise) refreshPromise = null;
    },
  );
  return currentRefreshPromise;
}

async function refreshForRequest(snapshot) {
  if (hasNewAccessToken(snapshot)) return true;
  const refreshed = await tryRefresh(snapshot);
  // Re-check after waiting.  A different request may have refreshed while
  // this request was waiting, even if its own refresh attempt failed.
  return refreshed || hasNewAccessToken(snapshot);
}

async function http(method, path, body, retry = true) {
  const snapshot = getTokenSnapshot();
  const token = snapshot.token;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Handle 401 — try one silent refresh then retry
  if (res.status === 401 && retry) {
    const refreshed = await refreshForRequest(snapshot);
    if (refreshed) return http(method, path, body, false);
    // Refresh failed — clear tokens so PrivateRoute redirects to login
    clearTokens();
    window.location.href = '/auth-login';
    return;
  }

  // Parse JSON (body may be empty on 204)
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  }

  if (!res.ok) {
    const details = data?.details
      ? ' — ' + Object.entries(data.details).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ')
      : '';
    const msg =
      data?.error ||
      data?.message ||
      (Array.isArray(data?.errors) ? data.errors.map((e) => e.message).join(', ') : null) ||
      `Request failed (${res.status})`;
    throw new Error(msg + details);
  }

  return data;
}

// ─── Public methods ────────────────────────────────────────────────────────────

export const apiGet    = (path)        => http('GET',    path);
export const apiPost   = (path, body)  => http('POST',   path, body);
export const apiPut    = (path, body)  => http('PUT',    path, body);
export const apiPatch  = (path, body)  => http('PATCH',  path, body);
export const apiDelete = (path)        => http('DELETE', path);

// ─── Authenticated binary downloads ───────────────────────────────────────────
// Smart Link artwork is intentionally protected by the same admin session as the
// rest of the portal.  Do not use a bare fetch here: it would miss token refresh
// and send users back to login when an otherwise valid refresh token exists.
async function downloadHttp(path, retry = true) {
  const snapshot = getTokenSnapshot();
  const token = snapshot.token;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { method: 'GET', headers });
  if (res.status === 401 && retry) {
    const refreshed = await refreshForRequest(snapshot);
    if (refreshed) return downloadHttp(path, false);
    clearTokens();
    window.location.href = '/auth-login';
    return null;
  }
  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    try {
      const data = await res.json();
      message = data?.error || data?.message || message;
    } catch {
      // An error page or an empty response has no useful structured detail.
    }
    throw new Error(message);
  }
  return res.blob();
}

/** GET a protected non-JSON response while preserving the normal refresh flow. */
export const apiDownload = (path) => downloadHttp(path);

// ─── Multipart upload (handles auth + 401 refresh the same as http()) ──────────

async function uploadHttp(path, formData, retry = true) {
  const snapshot = getTokenSnapshot();
  const token = snapshot.token;
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: formData });

  if (res.status === 401 && retry) {
    const refreshed = await refreshForRequest(snapshot);
    if (refreshed) return uploadHttp(path, formData, false);
    clearTokens();
    window.location.href = '/auth-login';
    return;
  }

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) data = await res.json();

  if (!res.ok) {
    const details = data?.details
      ? ' — ' + Object.entries(data.details).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ')
      : '';
    const msg =
      data?.error ||
      data?.message ||
      (Array.isArray(data?.errors) ? data.errors.map((e) => e.message).join(', ') : null) ||
      `Upload failed (${res.status})`;
    throw new Error(msg + details);
  }

  return data;
}

/** POST multipart/form-data with the same Bearer-token + silent-refresh logic as apiPost. */
export const apiUpload = (path, formData) => uploadHttp(path, formData);

