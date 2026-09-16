import assert from "node:assert/strict";
import test from "node:test";
import type {
  KioskCartLine,
  KioskMenu,
  KioskProduct,
  KioskSideChoice,
} from "@/lib/kiosk";
import {
  reconcileKioskCart,
  reconcileKioskSidePicker,
} from "@/lib/menu";

const category = (id: string, name: string) => ({ id, name, imageUrl: null });

function product(
  id: string,
  name: string,
  categoryIds: string[],
  options: Partial<Pick<KioskProduct, "comboSideCount" | "comboSideCategoryId" | "duplicateSideUpcharge">> = {},
): KioskProduct {
  return {
    id,
    name,
    description: null,
    imageUrl: null,
    categoryIds,
    primaryCategoryId: categoryIds[0] ?? null,
    comboSideCount: options.comboSideCount ?? 0,
    comboSideCategoryId: options.comboSideCategoryId ?? null,
    duplicateSideUpcharge: options.duplicateSideUpcharge ?? 0,
    items: [{ id: `${id}-item`, sku: id, price: 10 }],
  };
}

function comboMenu(
  combo: KioskProduct,
  sides: KioskProduct[],
  extraCategories = ["sides"],
): KioskMenu {
  return {
    categories: [
      category("food", "Jiggling Food Menu"),
      category("sides", "Sides"),
      ...extraCategories
        .filter((id) => id !== "sides")
        .map((id) => category(id, id)),
    ],
    products: [combo, ...sides],
  };
}

function comboLine(combo: KioskProduct, chosenSides: KioskSideChoice[]): KioskCartLine {
  return {
    product: combo,
    item: combo.items[0],
    qty: 1,
    sides: chosenSides,
  };
}

const sideA = product("side-a", "Beans", ["sides"]);
const sideB = product("side-b", "Slaw", ["sides"]);
const combo = product("combo", "Plate", ["food"], {
  comboSideCount: 2,
  comboSideCategoryId: "sides",
});
const chosenSides: KioskSideChoice[] = [
  { id: sideA.id, name: sideA.name, upcharge: 0 },
  { id: sideB.id, name: sideB.name, upcharge: 0 },
];

test("cart reconciliation blocks a side that disappeared", () => {
  const line = comboLine(combo, chosenSides);
  const result = reconcileKioskCart([line], comboMenu(combo, [sideA]));

  assert.equal(result.cart[0].qty, 1);
  assert.deepEqual(result.cart[0].sides, chosenSides);
  assert.deepEqual(result.invalidCartLineKeys, ["combo-item|side-a,side-b"]);
});

test("cart reconciliation blocks changed side category and side count", () => {
  const line = comboLine(combo, chosenSides);
  const changedCategorySide = product("side-b", "Slaw", ["different-category"]);
  const categoryResult = reconcileKioskCart(
    [line],
    comboMenu(combo, [sideA, changedCategorySide], ["sides", "different-category"]),
  );
  assert.equal(categoryResult.invalidCartLineKeys.length, 1);

  const oneSideCombo = product("combo", "Plate", ["food"], {
    comboSideCount: 1,
    comboSideCategoryId: "sides",
  });
  const countResult = reconcileKioskCart([line], comboMenu(oneSideCombo, [sideA, sideB]));
  assert.equal(countResult.invalidCartLineKeys.length, 1);

  const movedCombo = product("combo", "Plate", ["food"], {
    comboSideCount: 2,
    comboSideCategoryId: "different-category",
  });
  const comboCategoryResult = reconcileKioskCart(
    [line],
    comboMenu(movedCombo, [sideA, sideB], ["sides", "different-category"]),
  );
  assert.equal(comboCategoryResult.invalidCartLineKeys.length, 1);
});

test("open side picker closes when a selected side is unavailable", () => {
  const result = reconcileKioskSidePicker(combo, chosenSides, comboMenu(combo, [sideA]));

  assert.equal(result.shouldClose, true);
  assert.equal(result.product, null);
  assert.deepEqual(result.chosenSides, []);
});

test("open side picker rebases changed side display data", () => {
  const freshCombo = product("combo", "Plate (updated)", ["food"], {
    comboSideCount: 2,
    comboSideCategoryId: "sides",
  });
  const freshSide = product("side-a", "Beans (updated)", ["sides"], {
    duplicateSideUpcharge: 1.25,
  });

  const result = reconcileKioskSidePicker(
    combo,
    chosenSides,
    comboMenu(freshCombo, [freshSide, sideB]),
  );

  assert.equal(result.shouldClose, false);
  assert.equal(result.product?.name, "Plate (updated)");
  assert.deepEqual(result.chosenSides[0], {
    id: "side-a",
    name: "Beans (updated)",
    upcharge: 1.25,
  });
});

test("open side picker closes when combo side category changes", () => {
  const freshCombo = product("combo", "Plate", ["food"], {
    comboSideCount: 2,
    comboSideCategoryId: "new-sides",
  });
  const result = reconcileKioskSidePicker(
    combo,
    chosenSides,
    comboMenu(freshCombo, [sideA, sideB], ["sides", "new-sides"]),
  );

  assert.equal(result.shouldClose, true);
  assert.deepEqual(result.chosenSides, []);
});