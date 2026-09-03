---
name: Kiosk display pricing
description: Any price-affecting cart field must flow through the shared kiosk cartSubtotal helper or screens drift
---

Rule: when a new field affects a kiosk cart line's effective price, never compute subtotals inline per screen — use the single shared cart subtotal helper in the kiosk lib so every screen (menu, details, pay) shows the same number the server will charge.

**Why:** The duplicate-side upcharge feature initially updated the menu and details screens but missed the payment screen, which still showed the pre-upcharge total at the moment of payment — the worst place to diverge from the server-charged amount. Caught in review.

**How to apply:** Any change to kiosk line pricing (upcharges, discounts, modifiers) goes into the shared helper once; grep for inline `l.item.price * l.qty` style reductions in kiosk components and replace them.
