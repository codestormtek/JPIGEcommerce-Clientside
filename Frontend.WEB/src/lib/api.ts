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
    throw new Error(errBody.message || errBody.error || `API ${method} ${path} failed (${res.status})`);
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

export function buildQS(params: Record<string, string | number | boolean | undefined | null>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (!entries.length) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
}
