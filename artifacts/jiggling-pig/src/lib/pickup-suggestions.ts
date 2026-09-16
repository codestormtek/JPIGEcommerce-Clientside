import type { KioskCartLine, KioskMenu, KioskProduct } from "@/lib/kiosk";
import { KIOSK_DRINKS_CATEGORY, KIOSK_SIDES_CATEGORY } from "@/lib/menu";

const SUGGESTION_CATEGORY_NAMES = new Set([
  KIOSK_DRINKS_CATEGORY,
  KIOSK_SIDES_CATEGORY,
]);

function normalizedCategoryName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Returns a small set of optional add-ons for a pickup cart.
 *
 * Category membership is resolved through the menu's canonical category ids.
 * Product names are deliberately never inspected: the API menu is the source
 * of truth for which published, currently priced products can be suggested.
 */
export function selectPickupSuggestions(
  menu: KioskMenu,
  cart: KioskCartLine[],
  limit = 3,
): KioskProduct[] {
  const cappedLimit = Math.min(3, Math.max(0, Math.floor(limit)));
  if (cappedLimit === 0 || cart.length === 0 || menu.products.length === 0) {
    return [];
  }

  const suggestionCategoryIds = new Set(
    menu.categories
      .filter((category) => SUGGESTION_CATEGORY_NAMES.has(normalizedCategoryName(category.name)))
      .map((category) => category.id),
  );
  if (suggestionCategoryIds.size === 0) return [];

  const cartProductIds = new Set(cart.map((line) => line.product.id));
  const includedSideIds = new Set(
    cart.flatMap((line) => (line.sides ?? []).map((side) => side.id)),
  );
  const comboSideCategoryIds = new Set(
    cart
      .map((line) => line.product.comboSideCategoryId)
      .filter((categoryId): categoryId is string => Boolean(categoryId)),
  );
  const seenProductIds = new Set<string>();
  const suggestions: KioskProduct[] = [];

  for (const product of menu.products) {
    // A product without an item has no current published price and is not
    // selectable elsewhere in the pickup menu.
    if (product.items.length === 0) continue;
    if (cartProductIds.has(product.id) || includedSideIds.has(product.id)) continue;

    const isSuggestionCategory = product.categoryIds.some((categoryId) =>
      suggestionCategoryIds.has(categoryId),
    );
    if (!isSuggestionCategory) continue;

    // A side category referenced by a combo in this cart represents the
    // combo's included side choices. Do not offer those choices a second time.
    const isComboSide = product.categoryIds.some((categoryId) =>
      comboSideCategoryIds.has(categoryId),
    );
    if (isComboSide) continue;

    if (seenProductIds.has(product.id)) continue;
    seenProductIds.add(product.id);
    suggestions.push(product);
    if (suggestions.length >= cappedLimit) break;
  }

  return suggestions;
}