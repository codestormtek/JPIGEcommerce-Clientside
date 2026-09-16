import assert from "node:assert/strict";
import test from "node:test";
import {
  ApiRequestError,
  apiFetch,
  isMenuChangedError,
} from "@/lib/api";

async function fetchRejectedWithDetails(details: unknown): Promise<unknown> {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        message: "The menu changed before payment.",
        code: "MENU_CHANGED",
        details,
      }),
      { status: 409, headers: { "Content-Type": "application/json" } },
    );
  try {
    return await apiFetch("/pickup/orders", {
      method: "POST",
      body: { expectedTotalCents: 1234 },
    });
  } catch (error) {
    return error;
  } finally {
    globalThis.fetch = previousFetch;
  }
}

test("numeric MENU_CHANGED details remain a classified HTTP 409", async () => {
  const error = await fetchRejectedWithDetails({
    expectedTotalCents: 1234,
    actualTotalCents: 1275,
  });

  assert.equal(error instanceof ApiRequestError, true);
  assert.equal(isMenuChangedError(error), true);
  assert.match((error as Error).message, /expectedTotalCents: 1234/);
  assert.match((error as Error).message, /actualTotalCents: 1275/);
});

test("scalar and structured error details are formatted without throwing", async () => {
  const scalarError = await fetchRejectedWithDetails({
    reason: "price changed",
    retryable: false,
  });
  assert.equal(isMenuChangedError(scalarError), true);
  assert.match((scalarError as Error).message, /reason: price changed/);
  assert.match((scalarError as Error).message, /retryable: false/);

  const arrayError = await fetchRejectedWithDetails({
    fields: ["price", { expected: 10, actual: 11 }],
  });
  assert.equal(isMenuChangedError(arrayError), true);
  assert.match((arrayError as Error).message, /fields: price, \{"expected":10,"actual":11\}/);
});