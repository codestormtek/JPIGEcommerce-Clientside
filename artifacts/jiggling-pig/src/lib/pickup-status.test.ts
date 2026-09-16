import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyPickupCapabilityError,
  getSafePickupStatusPresentation,
  getPickupStatusPresentation,
  isPickupStatusTerminal,
} from "@/lib/pickup-status";

test("maps queued pickup statuses to Received", () => {
  assert.equal(getPickupStatusPresentation("pending").key, "received");
  assert.equal(getPickupStatusPresentation("confirmed").label, "Received");
});

test("maps preparation and ready statuses without using payment state", () => {
  assert.equal(getPickupStatusPresentation("processing").key, "preparing");
  assert.equal(getPickupStatusPresentation("ready_to_ship").label, "Ready for pickup");
  assert.equal(getPickupStatusPresentation("ready_to_ship").stepIndex, 2);
});

test("maps delivered and canceled statuses to terminal customer states", () => {
  assert.equal(getPickupStatusPresentation("delivered").key, "picked_up");
  assert.equal(getPickupStatusPresentation("canceled").key, "canceled");
  assert.equal(isPickupStatusTerminal("delivered"), true);
  assert.equal(isPickupStatusTerminal("canceled"), true);
});

test("unknown statuses never claim the order is ready", () => {
  const presentation = getPickupStatusPresentation("something_new");
  assert.equal(presentation.key, "unknown");
  assert.equal(presentation.stepIndex, -1);
  assert.equal(presentation.terminal, false);
});

test("only capability authorization and lookup failures are terminal", () => {
  assert.equal(classifyPickupCapabilityError(401), "permanent");
  assert.equal(classifyPickupCapabilityError(403), "permanent");
  assert.equal(classifyPickupCapabilityError(404), "permanent");
  assert.equal(classifyPickupCapabilityError(408), "transient");
  assert.equal(classifyPickupCapabilityError(429), "transient");
  assert.equal(classifyPickupCapabilityError(500), "transient");
  assert.equal(classifyPickupCapabilityError(undefined), "transient");
});

test("unavailable safety mode cannot retain a ready presentation", () => {
  const unavailable = getSafePickupStatusPresentation("ready_to_ship", "unavailable");
  assert.equal(unavailable.key, "unavailable");
  assert.equal(unavailable.label, "Tracking unavailable");
  assert.equal(unavailable.stepIndex, -1);
  assert.equal(unavailable.terminal, true);
  assert.equal(isPickupStatusTerminal("unavailable"), true);
});

test("transient safety mode labels the last known state", () => {
  const stale = getSafePickupStatusPresentation("ready_to_ship", "stale");
  assert.equal(stale.key, "ready_for_pickup");
  assert.equal(stale.label, "Last known: Ready for pickup");
  assert.match(stale.description, /don’t rely on this as its current status/);
  assert.equal(stale.terminal, false);
});