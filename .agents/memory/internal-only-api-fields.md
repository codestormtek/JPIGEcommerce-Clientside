---
name: Internal-only API fields
description: Pattern for server-generated fields that must never be client-suppliable (e.g. kiosk combo sidesText)
---

**Rule:** When a field on a public request body must only ever be generated server-side (e.g. `sidesText` snapshot on order lines, built from validated combo side IDs), do NOT add it to the public zod schema. Instead export an internal type extending the inferred schema type (`type CheckoutLine = z.infer<...> & { sidesText?: string }`) and have internal callers (kiosk service) pass it typed.

**Why:** zod `z.object` strips unknown keys at the API boundary, so clients literally cannot inject the field — verified by curl injection test (persisted null). Adding it to the schema instead would let any website/guest checkout store arbitrary display text.

**How to apply:** Public routes parse the zod schema (field stripped); internal services use the extended type. TS pitfall: `PlaceOrderInput & { lines: CheckoutLine[] }` intersects the array types and element access resolves to the *narrow* type — use `Omit<PlaceOrderInput, 'lines'> & { lines: CheckoutLine[] }` instead.

Related invariant pattern: paired config fields (comboSideCount > 0 requires comboSideCategoryId) are enforced in the product service with a normalize function that merges partial update input with the existing row before validating, and clears the stale companion field when the feature is turned off.
