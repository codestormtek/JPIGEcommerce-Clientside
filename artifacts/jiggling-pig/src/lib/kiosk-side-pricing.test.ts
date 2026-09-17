import assert from "node:assert/strict";
import test from "node:test";
import { cartLineKey, cartSubtotal, sidesUpcharge, type KioskCartLine } from "./kiosk";

const mac = { id: "mac", name: "Mac-n-Cheese", upcharge: 2 };
const beans = { id: "beans", name: "Baked Beans", upcharge: 0 };

test("first premium side is included; only the second serving costs $2", () => {
  assert.equal(sidesUpcharge([]), 0);
  assert.equal(sidesUpcharge([mac]), 0);
  assert.equal(sidesUpcharge([mac, beans]), 0);
  assert.equal(sidesUpcharge([mac, mac]), 2);
  assert.equal(sidesUpcharge([beans, beans]), 0);
});

test("removing a duplicate clears its extra charge", () => {
  const choices = [mac, mac];
  const removed = choices.filter((_, index) => index !== 0);
  assert.equal(removed.length, 1);
  assert.equal(sidesUpcharge(removed), 0);
});

test("cart quantity multiplies the base price plus one duplicate surcharge", () => {
  const line = { item: { id: "plate", price: 15 }, qty: 2, sides: [mac, mac] } as KioskCartLine;
  assert.equal(cartSubtotal([line]), 34);
  assert.deepEqual(line.sides?.map(side => side.id), ["mac", "mac"]);
  assert.notEqual(cartLineKey("plate", [mac, mac]), cartLineKey("plate", [mac, beans]));
});