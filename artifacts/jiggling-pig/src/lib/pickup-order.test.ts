import assert from "node:assert/strict";
import test from "node:test";
import { getPickupSmsOptIn } from "@/lib/pickup-order";

test("pickup SMS opt-in defaults to false unless explicitly selected", () => {
  assert.equal(getPickupSmsOptIn(undefined, false), false);
  assert.equal(getPickupSmsOptIn(true, false), false);
});

test("pickup SMS opt-in cannot bypass a disabled or missing public config flag", () => {
  assert.equal(getPickupSmsOptIn(false, true), false);
  assert.equal(getPickupSmsOptIn(undefined, true), false);
});

test("pickup SMS opt-in is true only when enabled and explicitly selected", () => {
  assert.equal(getPickupSmsOptIn(true, true), true);
});