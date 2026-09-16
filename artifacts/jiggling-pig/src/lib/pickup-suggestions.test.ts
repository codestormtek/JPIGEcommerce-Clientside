import assert from "node:assert/strict";
import test from "node:test";
import type { KioskCartLine, KioskMenu, KioskProduct, KioskSideChoice } from "@/lib/kiosk";
import { selectPickupSuggestions } from "@/lib/pickup-suggestions";

const category = (id: string, name: string) => ({ id, name, imageUrl: null });

function product(
  id: string,
  name: string,
  categoryIds: string[],
  options: Partial<Pick<KioskProduct, "comboSideCount" | "comboSideCategoryId">> = {},
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
    duplicateSideUpcharge: 0,
    available: true,
    items: [{ id: `${id}-item`, sku: id, price: 4.5, available: true }],
  };
}

function menu(categories: ReturnType<typeof category>[], products: KioskProduct[]): KioskMenu {
  return { categories, products };
}

function line(item: KioskProduct, sides?: KioskSideChoice[]): KioskCartLine {
  return { product: item, item: item.items[0], qty: 1, sides };
}

test("suggestions exclude cart products, selected sides, and combo side choices", () => {
  const combo = product("combo", "Family plate", ["food"], {
    comboSideCount: 2,
    comboSideCategoryId: "sides",
  });
  const selectedSide = product("selected-side", "Beans", ["sides"]);
  const otherSide = product("other-side", "Slaw", ["sides"]);
  const drink = product("drink", "Iced tea", ["drinks"]);
  const alreadyInCart = product("already-in-cart", "Lemonade", ["drinks"]);
  const result = selectPickupSuggestions(
    menu(
      [
        category("food", "Jiggling Food Menu"),
        category("sides", "Sides"),
        category("drinks", "Drinks"),
      ],
      [combo, selectedSide, otherSide, drink, alreadyInCart],
    ),
    [
      line(combo, [{ id: selectedSide.id, name: selectedSide.name }]),
      line(alreadyInCart),
    ],
  );

  assert.deepEqual(result.map((suggestion) => suggestion.id), ["drink"]);
});

test("no canonical drink or side category returns no suggestions", () => {
  const productWithoutSuggestionCategory = product("sauce", "Iced tea", ["sauces"]);
  const result = selectPickupSuggestions(
    menu([category("sauces", "Sauces")], [productWithoutSuggestionCategory]),
    [line(product("plate", "Plate", ["food"]))],
  );

  assert.deepEqual(result, []);
});

test("empty carts and empty menus return no suggestions", () => {
  const drink = product("drink", "Tea", ["drinks"]);
  const categories = [category("drinks", "Drinks")];

  assert.deepEqual(selectPickupSuggestions(menu(categories, [drink]), []), []);
  assert.deepEqual(selectPickupSuggestions(menu(categories, []), []), []);
});

test("products without a published menu item are not suggested", () => {
  const unavailable = product("unavailable", "Tea", ["drinks"]);
  unavailable.items = [];
  const available = product("available", "Soda", ["drinks"]);

  assert.deepEqual(
    selectPickupSuggestions(
      menu([category("drinks", "Drinks")], [unavailable, available]),
      [line(product("plate", "Plate", ["food"]))],
    ).map((item) => item.id),
    ["available"],
  );
});

test("sold-out products stay visible to the catalog but are not suggested", () => {
  const soldOut = product("sold-out", "Sold out tea", ["drinks"]);
  soldOut.available = false;
  soldOut.items[0].available = false;
  const available = product("available", "Soda", ["drinks"]);

  assert.deepEqual(
    selectPickupSuggestions(
      menu([category("drinks", "Drinks")], [soldOut, available]),
      [line(product("plate", "Plate", ["food"]))],
    ).map((item) => item.id),
    ["available"],
  );
});

test("selection uses the current menu snapshot after a menu change", () => {
  const oldDrink = product("old-drink", "Old tea", ["drinks"]);
  const newDrink = product("new-drink", "New tea", ["drinks"]);
  const categories = [category("drinks", "Drinks")];
  const cart = [line(product("plate", "Plate", ["food"]))];

  assert.deepEqual(
    selectPickupSuggestions(menu(categories, [oldDrink]), cart).map((item) => item.id),
    ["old-drink"],
  );
  assert.deepEqual(
    selectPickupSuggestions(menu(categories, [newDrink]), cart).map((item) => item.id),
    ["new-drink"],
  );
});