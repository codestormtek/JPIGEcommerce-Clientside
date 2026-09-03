/**
 * apiClient.js
 * Thin fetch wrapper for the JPIG API.
 * - All requests go to /api/v1/... (Vite proxies them to http://localhost:4000)
 * - Automatically attaches the Bearer token from localStorage
 * - On 401, attempts one silent token refresh then retries
 * - Throws a plain Error with the server's error message on failure
 */

const BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1`
  : '/api/v1';

// ─── Token helpers ─────────────────────────────────────────────────────────────

export function getAccessToken()  { return localStorage.getItem('accessToken'); }
export function getRefreshToken() { return localStorage.getItem('refreshToken'); }

export function saveTokens({ accessToken, refreshToken }) {
  if (accessToken)  localStorage.setItem('accessToken',  accessToken);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('authUser');
}

// ─── Core fetch ────────────────────────────────────────────────────────────────

async function http(method, path, body, retry = true) {
  const token = getAccessToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Handle 401 — try one silent refresh then retry
  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
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

// ─── Silent refresh ────────────────────────────────────────────────────────────

async function tryRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
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
}

// ─── Public methods ────────────────────────────────────────────────────────────

export const apiGet    = (path)        => http('GET',    path);
export const apiPost   = (path, body)  => http('POST',   path, body);
export const apiPut    = (path, body)  => http('PUT',    path, body);
export const apiPatch  = (path, body)  => http('PATCH',  path, body);
export const apiDelete = (path)        => http('DELETE', path);

// ─── Multipart upload (handles auth + 401 refresh the same as http()) ──────────

async function uploadHttp(path, formData, retry = true) {
  const token = getAccessToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: formData });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
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

