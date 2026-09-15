---
name: Legacy platform runtime
description: Why follow-up artifacts must preserve the existing Jiggling Pig web and database runtime.
---

Keep the existing customer website on its Next.js runtime and the backend on its Prisma-managed external PostgreSQL database when adding more artifacts. Do not convert either layer merely to match a newer scaffold.

**Why:** The migration goal is production behavior and visual parity. Rewriting the router, rendering model, API client, or ORM would create unnecessary regression risk against a live product and its existing data.

**How to apply:** Add new artifacts around the existing platform, reuse its `/api/v1` contract, and make only routing or package-workspace adaptations required by the managed workflows.

Operational management belongs in the established admin portal, not a second admin area inside the customer website.

**Why:** The user explicitly rejected splitting administration across two sites. Preserve the established admin login and navigation; customer scanning, pickup browsing, ordering, and payment remain on the storefront.

**How to apply:** Check the current production deployment documentation before choosing the admin source directory. A directory with a backup-like name can still be the active deployment source; its name alone is not evidence it is unused.