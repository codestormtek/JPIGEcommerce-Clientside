const isServer = typeof window === "undefined";
const API_BASE = isServer
  ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:80/api/v1")
  : "/api/v1";

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  cache?: RequestCache;
  next?: { revalidate?: number; tags?: string[] };
}

export class ApiRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function isMenuChangedError(error: unknown): boolean {
  return (
    error instanceof ApiRequestError &&
    error.status === 409 &&
    (error.code === "MENU_CHANGED" || error.message.includes("MENU_CHANGED"))
  );
}

function formatErrorDetailValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((entry) => formatErrorDetailValue(entry)).join(", ");
  }
  if (value !== null && typeof value === "object") {
    try {
      return JSON.stringify(value) ?? "[unserializable object]";
    } catch {
      return "[unserializable object]";
    }
  }
  return String(value);
}

function formatErrorDetails(details: unknown): string {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return formatErrorDetailValue(details);
  }
  return Object.entries(details)
    .map(([field, value]) => `${field}: ${formatErrorDetailValue(value)}`)
    .join("; ");
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: ApiOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, cache, next } = opts;

  const url = `${API_BASE}${path}`;

  const fetchOpts: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) fetchOpts.body = JSON.stringify(body);
  if (cache) fetchOpts.cache = cache;
  if (next) fetchOpts.next = next;

  const res = await fetch(url, fetchOpts);

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const body = errBody && typeof errBody === "object" ? errBody : {};
    const errorValue = typeof body.error === "object" ? body.error : undefined;
    const baseMsg =
      typeof body.message === "string"
        ? body.message
        : typeof body.error === "string"
          ? body.error
          : typeof errorValue?.message === "string"
            ? errorValue.message
            : `Request failed (${res.status})`;
    const code =
      typeof body.code === "string"
        ? body.code
        : typeof body.errorCode === "string"
          ? body.errorCode
          : typeof errorValue?.code === "string"
            ? errorValue.code
            : body.error === "MENU_CHANGED"
              ? body.error
              : undefined;
    if (body.details && typeof body.details === 'object') {
      const fieldErrors = formatErrorDetails(body.details);
      throw new ApiRequestError(
        fieldErrors ? `${baseMsg} — ${fieldErrors}` : baseMsg,
        res.status,
        code,
      );
    }
    throw new ApiRequestError(baseMsg, res.status, code);
  }

  if (res.status === 204) return undefined as T;
  const responseText = await res.text();
  return responseText ? JSON.parse(responseText) as T : undefined as T;
}

export function apiGet<T = unknown>(path: string, opts?: Omit<ApiOptions, "method" | "body">) {
  return apiFetch<T>(path, { ...opts, method: "GET" });
}

export function apiPost<T = unknown>(path: string, body: unknown, opts?: Omit<ApiOptions, "method" | "body">) {
  return apiFetch<T>(path, { ...opts, method: "POST", body });
}

export function apiPatch<T = unknown>(path: string, body: unknown, opts?: Omit<ApiOptions, "method" | "body">) {
  return apiFetch<T>(path, { ...opts, method: "PATCH", body });
}

export function apiDelete<T = unknown>(path: string, opts?: Omit<ApiOptions, "method" | "body">) {
  return apiFetch<T>(path, { ...opts, method: "DELETE" });
}

// ─── Authenticated fetch helpers ──────────────────────────────────────────────

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("jpig_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function tryRefreshToken(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem("jpig_refresh_token");
    if (!refreshToken) return null;
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { data?: { accessToken?: string }; accessToken?: string };
    const newToken = data?.data?.accessToken ?? data?.accessToken ?? null;
    if (newToken) localStorage.setItem("jpig_access_token", newToken);
    return newToken;
  } catch {
    return null;
  }
}

export async function apiAuthFetch<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const firstAttempt = await apiFetch<T>(path, {
    ...opts,
    headers: { ...getAuthHeader(), ...(opts.headers ?? {}) },
  }).catch(async (err: Error) => {
    if (err.message === "Invalid or expired token" || err.message === "No token provided") {
      const newToken = await tryRefreshToken();
      if (newToken) {
        return apiFetch<T>(path, {
          ...opts,
          headers: { Authorization: `Bearer ${newToken}`, ...(opts.headers ?? {}) },
        });
      }
    }
    throw err;
  });
  return firstAttempt;
}

export function apiAuthGet<T = unknown>(path: string, opts?: Omit<ApiOptions, "method" | "body">) {
  return apiAuthFetch<T>(path, { ...opts, method: "GET" });
}

export function apiAuthPost<T = unknown>(path: string, body: unknown, opts?: Omit<ApiOptions, "method" | "body">) {
  return apiAuthFetch<T>(path, { ...opts, method: "POST", body });
}

export function apiAuthPatch<T = unknown>(path: string, body: unknown, opts?: Omit<ApiOptions, "method" | "body">) {
  return apiAuthFetch<T>(path, { ...opts, method: "PATCH", body });
}

export function apiAuthDelete<T = unknown>(path: string, opts?: Omit<ApiOptions, "method" | "body">) {
  return apiAuthFetch<T>(path, { ...opts, method: "DELETE" });
}

export function buildQS(params: Record<string, string | number | boolean | undefined | null>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (!entries.length) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
}
