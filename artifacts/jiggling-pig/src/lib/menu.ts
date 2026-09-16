import {
  cartLineKey,
  type KioskCartLine,
  type KioskCategory,
  type KioskMenu,
  type KioskProduct,
  type KioskSideChoice,
} from "@/lib/kiosk";

export const KIOSK_FOOD_CATEGORY = "jiggling food menu";
export const KIOSK_SIDES_CATEGORY = "sides";
export const KIOSK_PRODUCTS_CATEGORY = "jiggling pig products";

const PRODUCT_TAB_NAMES = ["drinks", "sauces", "rubs", "fry mixes", "teas"] as const;
const norm = (value: string) => value.trim().toLowerCase();

export interface KioskMenuTab {
  id: string;
  name: string;
}

export interface KioskMenuSection {
  title: string | null;
  products: KioskProduct[];
}

/**
 * This is the single source of truth for the kiosk's visible menu tabs. Keep
 * the standard tab order stable: pickup uses these same ids and labels.
 *
 * If no standard tabs exist, all catalog categories are shown as a fallback,
 * matching the kiosk's original behavior.
 */
export function getKioskMenuTabs(menu: KioskMenu): KioskMenuTab[] {
  const byName = (name: string) =>
    menu.categories.find((category) => norm(category.name) === name);
  const standard = [
    byName(KIOSK_FOOD_CATEGORY),
    byName(KIOSK_SIDES_CATEGORY),
    byName(KIOSK_PRODUCTS_CATEGORY),
    ...PRODUCT_TAB_NAMES.map(byName),
  ].filter((category): category is KioskCategory => Boolean(category));
  const ordered = standard.length > 0 ? standard : menu.categories;
  return ordered.map(({ id, name }) => ({ id, name }));
}

export function getKioskMenuTabLabel(tab: Pick<KioskMenuTab, "name">): string {
  return norm(tab.name) === KIOSK_FOOD_CATEGORY ? "BBQ Combos" : tab.name;
}

function categoryLookup(menu: KioskMenu): Map<string, KioskCategory> {
  return new Map(menu.categories.map((category) => [category.id, category]));
}

function hasCategory(
  product: KioskProduct,
  categories: Map<string, KioskCategory>,
  name: string,
): boolean {
  return product.categoryIds.some((categoryId) => {
    const category = categories.get(categoryId);
    return category ? norm(category.name) === name : false;
  });
}

function menuProductGroups(
  menu: KioskMenu,
  categories: Map<string, KioskCategory>,
): KioskMenuSection[] {
  const all = menu.products;
  const inFoodTab = (product: KioskProduct) =>
    hasCategory(product, categories, KIOSK_FOOD_CATEGORY) ||
    hasCategory(product, categories, "combo dinners") ||
    hasCategory(product, categories, KIOSK_SIDES_CATEGORY) ||
    hasCategory(product, categories, "drinks");
  const members = all.filter(
    (product) =>
      hasCategory(product, categories, KIOSK_PRODUCTS_CATEGORY) || !inFoodTab(product),
  );

  const groups = new Map<string, KioskProduct[]>();
  members.forEach((product) => {
    const subCategoryId = product.categoryIds.find((categoryId) => {
      const category = categories.get(categoryId);
      if (!category) return false;
      const name = norm(category.name);
      return name !== KIOSK_PRODUCTS_CATEGORY && name !== KIOSK_FOOD_CATEGORY;
    });
    const title = subCategoryId
      ? categories.get(subCategoryId)?.name ?? "Other Items"
      : "Other Items";
    const list = groups.get(title) ?? [];
    list.push(product);
    groups.set(title, list);
  });

  const titles = [...groups.keys()].sort((a, b) => {
    if (a === "Other Items") return 1;
    if (b === "Other Items") return -1;
    return a.localeCompare(b);
  });
  return titles.map((title) => ({ title, products: groups.get(title)! }));
}

/**
 * Returns the exact section grouping used by the kiosk MenuScreen.
 */
export function getKioskMenuSections(
  menu: KioskMenu,
  activeCategoryId: string | null,
): KioskMenuSection[] {
  const categories = categoryLookup(menu);
  const tabs = getKioskMenuTabs(menu);
  const tab = tabs.find(({ id }) => id === activeCategoryId);
  if (!tab) return [{ title: null, products: menu.products }];

  const tabName = norm(tab.name);
  const hasCat = (product: KioskProduct, name: string) =>
    hasCategory(product, categories, name);

  if (tabName === KIOSK_FOOD_CATEGORY) {
    const combo = menu.products.filter((product) => hasCat(product, "combo dinners"));
    const comboIds = new Set(combo.map((product) => product.id));
    const sides = menu.products.filter(
      (product) =>
        !comboIds.has(product.id) && hasCat(product, KIOSK_SIDES_CATEGORY),
    );
    const sideIds = new Set(sides.map((product) => product.id));
    const drinks = menu.products.filter(
      (product) =>
        !comboIds.has(product.id) &&
        !sideIds.has(product.id) &&
        hasCat(product, "drinks"),
    );
    const drinkIds = new Set(drinks.map((product) => product.id));
    const other = menu.products.filter(
      (product) =>
        hasCat(product, KIOSK_FOOD_CATEGORY) &&
        !comboIds.has(product.id) &&
        !sideIds.has(product.id) &&
        !drinkIds.has(product.id),
    );
    return [
      { title: "Plates", products: combo },
      { title: "Sides", products: sides },
      { title: "Other Items", products: other },
    ].filter((section) => section.products.length > 0);
  }

  if (tabName === KIOSK_SIDES_CATEGORY) {
    return [
      {
        title: null,
        products: menu.products.filter((product) =>
          hasCat(product, KIOSK_SIDES_CATEGORY),
        ),
      },
    ];
  }

  if (tabName === KIOSK_PRODUCTS_CATEGORY) {
    return menuProductGroups(menu, categories);
  }

  return [
    {
      title: null,
      products: menu.products.filter((product) =>
        product.categoryIds.includes(tab.id),
      ),
    },
  ];
}

/**
 * Pickup keeps its "All" view, but assigns each product to one canonical
 * section in kiosk order so no product is duplicated or omitted there.
 */
export function getKioskMenuAllSections(menu: KioskMenu): KioskMenuSection[] {
  const categories = categoryLookup(menu);
  const all = menu.products;
  const hasCat = (product: KioskProduct, name: string) =>
    hasCategory(product, categories, name);
  const comboIds = new Set(
    all
      .filter((product) => hasCat(product, "combo dinners"))
      .map((product) => product.id),
  );
  const sideIds = new Set(
    all
      .filter(
        (product) =>
          !comboIds.has(product.id) && hasCat(product, KIOSK_SIDES_CATEGORY),
      )
      .map((product) => product.id),
  );
  const drinkIds = new Set(
    all
      .filter(
        (product) =>
          !comboIds.has(product.id) &&
          !sideIds.has(product.id) &&
          hasCat(product, "drinks"),
      )
      .map((product) => product.id),
  );

  const groups = new Map<string, KioskProduct[]>();
  const add = (title: string, product: KioskProduct) => {
    const products = groups.get(title) ?? [];
    products.push(product);
    groups.set(title, products);
  };

  all.forEach((product) => {
    if (comboIds.has(product.id)) {
      add("Plates", product);
      return;
    }
    if (sideIds.has(product.id)) {
      add("Sides", product);
      return;
    }
    if (drinkIds.has(product.id)) {
      add("Drinks", product);
      return;
    }
    if (hasCat(product, KIOSK_FOOD_CATEGORY)) {
      add("Other Items", product);
      return;
    }

    const productSections = menuProductGroups({
      categories: menu.categories,
      products: [product],
    }, categories);
    if (productSections.length > 0) {
      add(productSections[0].title ?? "Other Items", product);
      return;
    }

    const fallbackCategory = product.categoryIds
      .map((categoryId) => categories.get(categoryId))
      .find(Boolean);
    add(fallbackCategory?.name ?? "Other Items", product);
  });

  const preferredOrder = ["Plates", "Sides", "Drinks", "Other Items"];
  const titles = [...groups.keys()].sort((a, b) => {
    const aIndex = preferredOrder.indexOf(a);
    const bIndex = preferredOrder.indexOf(b);
    if (aIndex >= 0 || bIndex >= 0) {
      return (aIndex < 0 ? preferredOrder.length : aIndex) -
        (bIndex < 0 ? preferredOrder.length : bIndex);
    }
    if (a === "Other Items") return 1;
    if (b === "Other Items") return -1;
    return a.localeCompare(b);
  });
  return titles.map((title) => ({ title, products: groups.get(title)! }));
}

export interface KioskCartReconciliation {
  cart: KioskCartLine[];
  changed: boolean;
  unavailableProductIds: string[];
  invalidCartLineKeys: string[];
}

/**
 * Keep cart quantities and selected side ids intact while replacing display
 * snapshots with the newest catalog snapshot. This never invents a substitute
 * SKU: a line whose exact item disappeared remains in the cart and is reported
 * as unavailable for the checkout UI/server to handle explicitly.
 */
export function reconcileKioskCart(
  cart: KioskCartLine[],
  menu: KioskMenu,
): KioskCartReconciliation {
  const unavailableProductIds: string[] = [];
  const invalidCartLineKeys: string[] = [];
  let changed = false;
  const nextCart = cart.map((line) => {
    const lineKey = cartLineKey(line.item.id, line.sides);
    const freshProduct = menu.products.find(
      (product) =>
        product.id === line.product.id &&
        product.items.some((item) => item.id === line.item.id),
    );
    if (!freshProduct) {
      unavailableProductIds.push(line.product.id);
      invalidCartLineKeys.push(lineKey);
      changed = true;
      return line;
    }

    const freshItem = freshProduct.items.find((item) => item.id === line.item.id)!;
    const freshSideChoices: KioskSideChoice[] = [];
    let sidesAreValid = true;
    const freshSides = line.sides?.map((side) => {
      const freshSide = menu.products.find((product) => product.id === side.id);
      if (
        !freshSide ||
        freshSide.items.length === 0 ||
        !freshProduct.comboSideCategoryId ||
        !freshSide.categoryIds.includes(freshProduct.comboSideCategoryId)
      ) {
        sidesAreValid = false;
        changed = true;
        return side;
      }
      const nextChoice = {
        ...side,
        name: freshSide.name,
        upcharge: freshSide.duplicateSideUpcharge,
      };
      freshSideChoices.push(nextChoice);
      if (
        nextChoice.name !== side.name ||
        nextChoice.upcharge !== side.upcharge
      ) {
        changed = true;
      }
      return nextChoice;
    });
    const expectedSideCount = freshProduct.comboSideCount;
    const actualSideCount = line.sides?.length ?? 0;
    const comboStructureChanged =
      freshProduct.comboSideCount !== line.product.comboSideCount ||
      freshProduct.comboSideCategoryId !== line.product.comboSideCategoryId;
    const hasInvalidSideShape =
      comboStructureChanged ||
      (expectedSideCount > 0
        ? !freshProduct.comboSideCategoryId ||
          actualSideCount !== expectedSideCount ||
          !sidesAreValid ||
          freshSideChoices.length !== actualSideCount
        : actualSideCount > 0);
    if (hasInvalidSideShape) {
      invalidCartLineKeys.push(lineKey);
      changed = true;
    }
    if (
      freshProduct.name !== line.product.name ||
      freshProduct.description !== line.product.description ||
      freshProduct.imageUrl !== line.product.imageUrl ||
      freshItem.price !== line.item.price ||
      freshSides?.some((side, index) => side.id !== line.sides?.[index]?.id)
    ) {
      changed = true;
    }
    return {
      ...line,
      product: freshProduct,
      item: freshItem,
      ...(freshSides ? { sides: freshSides } : {}),
    };
  });
  return { cart: nextCart, changed, unavailableProductIds, invalidCartLineKeys };
}

export interface KioskSidePickerReconciliation {
  product: KioskProduct | null;
  chosenSides: KioskSideChoice[];
  shouldClose: boolean;
  changed: boolean;
}

/**
 * Rebase an open side picker against a new catalog snapshot. A structural
 * change (combo count/category or a selected side becoming unavailable) closes
 * the picker and clears selections; cosmetic/name/upcharge changes rebase in
 * place so a guest never confirms stale side data.
 */
export function reconcileKioskSidePicker(
  product: KioskProduct | null,
  chosenSides: KioskSideChoice[],
  menu: KioskMenu,
): KioskSidePickerReconciliation {
  if (!product) {
    return { product: null, chosenSides: [], shouldClose: false, changed: false };
  }
  const freshProduct = menu.products.find((candidate) => candidate.id === product.id);
  if (
    !freshProduct ||
    freshProduct.items.length === 0 ||
    freshProduct.comboSideCount <= 0 ||
    !freshProduct.comboSideCategoryId ||
    freshProduct.comboSideCount !== product.comboSideCount ||
    freshProduct.comboSideCategoryId !== product.comboSideCategoryId
  ) {
    return { product: null, chosenSides: [], shouldClose: true, changed: true };
  }

  const rebasedSides: KioskSideChoice[] = [];
  for (const side of chosenSides) {
    const freshSide = menu.products.find((candidate) => candidate.id === side.id);
    if (
      !freshSide ||
      freshSide.items.length === 0 ||
      !freshSide.categoryIds.includes(freshProduct.comboSideCategoryId)
    ) {
      return { product: null, chosenSides: [], shouldClose: true, changed: true };
    }
    rebasedSides.push({
      ...side,
      name: freshSide.name,
      upcharge: freshSide.duplicateSideUpcharge,
    });
  }
  if (rebasedSides.length > freshProduct.comboSideCount) {
    return { product: null, chosenSides: [], shouldClose: true, changed: true };
  }

  const changed =
    freshProduct !== product ||
    rebasedSides.some(
      (side, index) =>
        side.name !== chosenSides[index]?.name ||
        side.upcharge !== chosenSides[index]?.upcharge,
    );
  return {
    product: freshProduct,
    chosenSides: rebasedSides,
    shouldClose: false,
    changed,
  };
}