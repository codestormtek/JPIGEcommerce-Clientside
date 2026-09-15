import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET } from "./route";

const requestFor = (query = "") =>
  new NextRequest(`https://thejigglingpig.com/go/shop-products${query}`);

async function withResolver(
  resolver: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  run: () => Promise<void>,
) {
  const previousFetch = globalThis.fetch;
  const previousApiUrl = process.env.NEXT_PUBLIC_API_URL;
  delete process.env.NEXT_PUBLIC_API_URL;
  globalThis.fetch = resolver as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = previousApiUrl;
  }
}

const context = { params: Promise.resolve({ slug: "shop-products" }) };

test("redirects to an allowlisted destination with a query string", async () => {
  let resolverUrl = "";
  await withResolver(async (input) => {
    resolverUrl = String(input);
    return new Response(JSON.stringify({
      data: {
        url: "https://thejigglingpig.com/shop?utm_source=qr&campaign=spring",
        allowedOrigins: ["https://thejigglingpig.com/"],
      },
    }), { status: 200 });
  }, async () => {
    const response = await GET(requestFor("?test=1&ignored=by-resolver"), context);

    assert.equal(response.status, 302);
    assert.equal(
      response.headers.get("location"),
      "https://thejigglingpig.com/shop?utm_source=qr&campaign=spring",
    );
    assert.equal(new URL(resolverUrl).search, "?test=1");
    assert.equal(response.headers.get("cache-control"), "no-store, no-cache, must-revalidate, max-age=0");
    assert.equal(response.headers.get("pragma"), "no-cache");
  });
});



test("uses a same-origin root fallback for missing or failed resolutions", async () => {
  for (const resolver of [
    async () => new Response(JSON.stringify({ data: {} }), { status: 200 }),
    async () => new Response("upstream unavailable", { status: 503 }),
  ]) {
    await withResolver(resolver, async () => {
      const response = await GET(requestFor(), context);
      assert.equal(response.status, 302);
      assert.equal(response.headers.get("location"), "https://thejigglingpig.com/");
      assert.equal(response.headers.get("cache-control"), "no-store, no-cache, must-revalidate, max-age=0");
    });
  }
});


test("rejects unallowlisted, private, and Smart Link-chain destinations", async () => {
  for (const url of [
    "https://evil.example/phishing",
    "https://127.0.0.1/admin",
    "https://[::ffff:127.0.0.1]/admin",
    "https://thejigglingpig.com/go/another-link",
  ]) {
    await withResolver(async () => new Response(JSON.stringify({
      data: {
        url,
        allowedOrigins: [
          "https://thejigglingpig.com",
          "https://127.0.0.1",
          "https://[::ffff:127.0.0.1]",
        ],
      },
    }), { status: 200 }), async () => {
      const response = await GET(requestFor(), context);
      assert.equal(response.status, 302);
      assert.equal(response.headers.get("location"), "https://thejigglingpig.com/");
    });
  }
});