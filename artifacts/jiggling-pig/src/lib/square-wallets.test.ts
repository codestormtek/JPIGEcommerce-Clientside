import assert from "node:assert/strict";
import test from "node:test";
import { pickupWalletRequest, squareWalletToken } from "./square-wallets";

test("wallet sheets use the exact expected total in USD, including sides and tax", () => {
  assert.deepEqual(pickupWalletRequest(2120), {
    countryCode: "US",
    currencyCode: "USD",
    total: { amount: "21.20", label: "The Jiggling Pig" },
    requestBillingContact: false,
    requestShippingContact: false,
  });
  assert.equal(pickupWalletRequest(2000).total.amount, "20.00");
  assert.equal(pickupWalletRequest(1).total.amount, "0.01");
});

test("invalid or fractional-cent totals cannot initialize wallet payment", () => {
  for (const value of [0, -1, 2.5, NaN, Infinity]) {
    assert.throws(() => pickupWalletRequest(value));
  }
});

test("only successful Square results produce a source token", () => {
  assert.equal(squareWalletToken({ status: "OK", token: "test-wallet-source" }), "test-wallet-source");
  assert.throws(() => squareWalletToken({ status: "OK" }));
  assert.throws(() => squareWalletToken({ status: "ERROR", errors: [{ message: "Not authorized" }] }), /Not authorized/);
});

test("wallet cancellation produces no payment token", () => {
  for (const status of ["Cancel", "CANCELED", "cancelled"]) {
    assert.equal(squareWalletToken({ status }), null);
  }
});