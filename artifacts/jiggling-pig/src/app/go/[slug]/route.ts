import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function publicHttpsOrigin(value: string, allowPath = false) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const privateHost = hostname === "localhost"
      || hostname.endsWith(".local")
      || hostname === "::"
      || hostname === "::1"
      || /^(?:fc|fd)[0-9a-f:]*$/i.test(hostname)
      || /^fe[89ab][0-9a-f:]*$/i.test(hostname)
      || /^0\./.test(hostname)
      || /^127\./.test(hostname)
      || /^10\./.test(hostname)
      || /^169\.254\./.test(hostname)
      || /^192\.168\./.test(hostname)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
    if (url.protocol !== "https:" || url.username || url.password || privateHost
      || (!allowPath && (url.pathname !== "/" && url.pathname !== ""))
      || url.search || url.hash) return null;
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

/**
 * Keep printed /go URLs on the public web origin while the authoritative
 * resolver and aggregate visit counter live in the API service. Fetching with
 * manual redirect preserves the resolver's chosen target and its no-cache
 * behavior rather than having Next follow it on the visitor's behalf.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  // The internal /api rewrite reaches the API service without exposing a
  // separate NEXT_PUBLIC API origin. The API reads the canonical setting and
  // returns both the validated target and the exact configured allowlist.
  const relayBase = request.nextUrl.origin;
  let target = relayBase;
  try {
    const resolver = new URL(`/api/v1/smart-links/resolve/${encodeURIComponent(slug)}`, relayBase);
    if (request.nextUrl.searchParams.get("test") === "1") resolver.searchParams.set("test", "1");
    const upstream = await fetch(resolver, {
      headers: request.headers.get("referer") ? { referer: request.headers.get("referer")! } : {},
      redirect: "manual",
      cache: "no-store",
    });
    const payload = await upstream.json() as { data?: { url?: string; allowedOrigins?: string[] } };
    const destination = payload.data?.url;
    const allowedOrigins = payload.data?.allowedOrigins;
    if (destination && Array.isArray(allowedOrigins)) {
      const candidate = new URL(destination);
      // Defense in depth for legacy data and upstream configuration mistakes:
      // never allow the web relay to become an external open redirect or a
      // Smart Link redirect chain.
      if (allowedOrigins.includes(candidate.origin) && !isSmartLinkPath(candidate, candidate.origin)) target = candidate.toString();
    }
  } catch {
    // The short link remains safe during a transient API outage: users return
    // to the current site rather than receiving a cacheable error page.
  }
  const response = NextResponse.redirect(target, 302);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}