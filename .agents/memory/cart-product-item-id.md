---
name: Cart items must carry productItemId
description: Why "cart item(s) are missing product info" happens at checkout and where to set productItemId
---

# Cart productItemId requirement (Frontend.WEB)

Checkout (`CheckOutMain.tsx`) blocks submit with "N cart item(s) are missing product info" for any cart item whose `productItemId` is empty, and shows a "Remove invalid items from cart" button as the only recovery.

**Rule:** every add-to-cart entry point must set `productItemId` on the cart item, sourced from `product.items?.[0]?.id`.

**Why:** the order API needs a concrete ProductItem (SKU/variant) id, not just a product. The Express template's card components (`*Main` in `components/product-main/`) and their data wrappers (`components/product/`) were copied from a demo and originally never plumbed `productItemId` through, so items added anywhere except the product-detail page silently became un-checkout-able.

**How to apply:** when adding/editing any product card or add-to-cart path:
- Card component (`*Main.tsx`): add optional `ProductItemId?: string` prop, destructure it, and include `productItemId: ProductItemId` in the `addToCart({...})` payload (cart block only, not wishlist).
- Real-API wrapper (e.g. `FeatureProduct`, `WeeklyBestSelling`, `DiscountProduct`, `RelatedProduct`): pass `ProductItemId={product.items?.[0]?.id}`.
- Quick-view modal path: `ProductDetails` already accepts `productItemId`; callers must pass it (FeatureProduct's `productToQuickView` object + render; `WeeklyBestSellingMain`'s internal `<ProductDetails>`).
- Compare/wishlist "add to cart" forward `item.productItemId` (only works if those contexts stored it — full wishlist/compare plumbing was not done).
- Wrappers rendering static demo data (`post.*`: DealOfDay, WeeklySellThree, PopularProduct, WeeklySellFour, FeaturesGrid) are template placeholders, not real products — left unchanged.
