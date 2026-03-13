const isServer = typeof window === "undefined";
const API_BASE = isServer
  ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1")
  : "/api/v1";

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  cache?: RequestCache;
  next?: { revalidate?: number; tags?: string[] };
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
    const baseMsg = errBody.message || errBody.error || `Request failed (${res.status})`;
    if (errBody.details && typeof errBody.details === 'object') {
      const fieldErrors = Object.entries(errBody.details as Record<string, string[]>)
        .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
        .join('; ');
      throw new Error(fieldErrors ? `${baseMsg} — ${fieldErrors}` : baseMsg);
    }
    throw new Error(baseMsg);
  }

  return res.json();
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

export function apiAuthFetch<T = unknown>(path: string, opts: ApiOptions = {}) {
  return apiFetch<T>(path, {
    ...opts,
    headers: { ...getAuthHeader(), ...(opts.headers ?? {}) },
  });
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
