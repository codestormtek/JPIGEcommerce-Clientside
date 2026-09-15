import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isPrivateIpv4(value: string) {
  const octets = value.split(".").map(Number);
  if (octets.some((octet) => octet > 255)) return true;
  const [first, second] = octets;
  return first === 0
    || first === 10
    || first === 100 && second >= 64 && second <= 127
    || first === 127
    || first === 169 && second === 254
    || first === 172 && second >= 16 && second <= 31
    || first === 192 && second === 168
    || first === 198 && (second === 18 || second === 19);
}

function isPrivateHostname(value: string) {
  const hostname = value.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  const privateHost = hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
    || hostname.endsWith(".internal")
    || hostname === "::"
    || hostname === "::1"
    || hostname === "0"
    || /^(?:fc|fd)[0-9a-f:]*$/i.test(hostname)
    || /^fe[89ab][0-9a-f:]*$/i.test(hostname);
  if (privateHost) return true;

  const ipv4 = hostname.match(/^(?:\:\:ffff\:)?(\d{1,3}(?:\.\d{1,3}){3})$/i)?.[1];
  if (ipv4) return isPrivateIpv4(ipv4);

  const mapped = hostname.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (mapped) {
    const high = Number.parseInt(mapped[1], 16);
    const low = Number.parseInt(mapped[2], 16);
    return isPrivateIpv4(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
  }

  // URL normalizes the common hexadecimal and integer IPv4 spellings, but
  // reject an integer spelling as well for runtimes that do not normalize it.
  if (/^\d+$/.test(hostname)) {
    const numeric = Number(hostname);
    return Number.isSafeInteger(numeric) && numeric <= 0xffffffff;
  }
  return false;
}

function publicHttpsOrigin(value: unknown) {
  try {
    if (typeof value !== "string") return null;
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || isPrivateHostname(url.hostname)
      || (url.pathname !== "/" && url.pathname !== "") || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function isSmartLinkPath(url: URL, origin: string) {
  if (url.origin !== origin) return false;
  try {
    const pathname = decodeURIComponent(url.pathname).toLowerCase();
    return pathname === "/go" || pathname.startsWith("/go/");
  } catch {
    return true;
  }
}

function safeDestination(value: unknown, allowedOrigins: unknown[]) {
  if (typeof value !== "string") return null;
  let candidate: URL;
  try {
    candidate = new URL(value);
  } catch {
    return null;
  }

  // The API validates stored links, but the storefront must not become an
  // open redirect if old data or a misconfigured resolver is ever returned.
  if (candidate.protocol !== "https:" || candidate.username || candidate.password
    || isPrivateHostname(candidate.hostname)) return null;
  const allowed = allowedOrigins
    .map(publicHttpsOrigin)
    .filter((origin): origin is string => Boolean(origin));
  if (!allowed.includes(candidate.origin)) return null;
  if (isSmartLinkPath(candidate, candidate.origin)) return null;
  return candidate.toString();
}

function resolverUrl(request: NextRequest, slug: string) {
  const configuredApi = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!configuredApi) {
    return new URL(`/api/v1/smart-links/resolve/${encodeURIComponent(slug)}`, request.nextUrl.origin);
  }

  // Server-side use of the configured API avoids a request from the Render
  // server back through its own public hostname. The value is deployment
  // configuration, not a user-controlled redirect target.
  const api = new URL(configuredApi);
  if ((api.protocol !== "http:" && api.protocol !== "https:")
    || api.username || api.password || api.search || api.hash) {
    throw new Error("Invalid NEXT_PUBLIC_API_URL");
  }
  api.pathname = `${api.pathname.replace(/\/+$/, "")}/smart-links/resolve/${encodeURIComponent(slug)}`;
  return api;
}

/**
 * Keep printed /go URLs on the public web origin while the authoritative
 * resolver and aggregate visit counter live in the API service. Fetching with
 * manual redirect preserves the resolver's chosen target and its no-cache
 * behavior rather than having Next follow it on the visitor's behalf.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const target = new URL("/", request.nextUrl.origin).toString();
  let destination = target;
  try {
    const resolver = resolverUrl(request, slug);
    if (request.nextUrl.searchParams.get("test") === "1") resolver.searchParams.set("test", "1");
    const upstream = await fetch(resolver, {
      headers: request.headers.get("referer") ? { referer: request.headers.get("referer")! } : {},
      redirect: "manual",
      cache: "no-store",
    });
    if (!upstream.ok) throw new Error(`Smart Link resolver returned ${upstream.status}`);
    const payload = await upstream.json() as {
      data?: { url?: unknown; allowedOrigins?: unknown };
    };
    if (payload.data && Array.isArray(payload.data.allowedOrigins)) {
      const safe = safeDestination(payload.data.url, payload.data.allowedOrigins);
      if (safe) destination = safe;
    }
  } catch {
    // The short link remains safe during a transient API outage: users return
    // to the current site rather than receiving a cacheable error page.
  }
  const response = NextResponse.redirect(destination, 302);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
