---
name: Legacy platform runtime
description: Why follow-up artifacts must preserve the existing Jiggling Pig web and database runtime.
---

Keep the existing customer website on its Next.js runtime and the backend on its Prisma-managed external PostgreSQL database when adding more artifacts. Do not convert either layer merely to match a newer scaffold.

**Why:** The migration goal is production behavior and visual parity. Rewriting the router, rendering model, API client, or ORM would create unnecessary regression risk against a live product and its existing data.

**How to apply:** Add new artifacts around the existing platform, reuse its `/api/v1` contract, and make only routing or package-workspace adaptations required by the managed workflows.