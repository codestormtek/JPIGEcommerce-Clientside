---
name: Auto-seed default rows on read (idempotent)
description: Pattern for tables that must ship with default rows on both dev and prod without a manual seed/migration step (e.g. footer social links).
---

When a feature needs default rows present everywhere (dev + prod) and prod does NOT
auto-apply schema or run seed scripts, seed lazily from the service layer on first read.

**Pattern (used by the social-links module):**
- Service `ensureSeeded()` called from both the public and admin list endpoints.
- Guard: `if (await repo.count() > 0) return;` — never re-seed once rows exist.
- Insert defaults with **deterministic primary-key IDs** (e.g. `seed-facebook`) via
  `createMany({ data, skipDuplicates: true })`.
- Also wrap in an in-memory `let seeding: Promise|null` so one process doesn't fire
  concurrent seeds.

**Why:** deterministic IDs + `skipDuplicates` make concurrent inserts (multiple
requests, or multiple Render instances cold-starting) a no-op instead of creating
duplicate rows — true cross-instance idempotency without an extra lock table or a
unique constraint on a business column (which would wrongly block legit duplicate
platforms).

**Tradeoff to remember:** the `count()===0` guard means if an admin deletes ALL rows,
defaults will reappear on next read (self-healing). If "stay empty after admin clears
it" is ever required, switch the gate to a persisted seeded-flag instead of a count.

**Deploy note:** the table itself is still a schema change — prod needs the additive
table created (Prisma db push against prod URL) before the lazy seed can run.

**Related:** any public-rendered admin-entered URL (footer links) must be scheme-
validated server-side (allow only `http(s)://` or `#`) to block `javascript:`/`data:`
injection. Reorder endpoints that set sortOrder per row must run in a single
transaction AND validate the id list is the complete, duplicate-free current set.
