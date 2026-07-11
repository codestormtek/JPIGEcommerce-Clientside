---
name: Product channel visibility
description: Product.visibility (website|kiosk|both) filtering and the admin visibility=all requirement
---

The public `GET /products` endpoint serves BOTH the storefront and every admin product picker. Its default filter hides kiosk-only products (`visibility in ['website','both']`).

**Why:** kiosk-only road-food meals must not appear on the website, but admins must still manage/link them everywhere.

**How to apply:** any NEW admin UI that lists, searches, or selects products must append `visibility=all` to the query, or kiosk-only products silently disappear from that picker (this bit Inventory, Promotions, and Recipes pages when the flag was introduced). Kiosk queries filter `['kiosk','both']`. `visibility=all` is deliberately public — it's merchandising, not access control; product detail by ID is public regardless.
