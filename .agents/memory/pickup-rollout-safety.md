---
name: Pickup rollout safety
description: External database and physical ticket constraints for pickup rollout.
---

Do not assume the external PostgreSQL connection in this workspace is isolated from the live store. Confirm the target and operator approval before applying additive migrations.

**Why:** Prisma's default order reads include newly generated scalar fields; deploying a changed client before the additive schema can break existing order paths, even with new features disabled.

**How to apply:** Review and apply the additive schema before deploying the dependent application; never auto-run db push on development startup.

Keep a printer's ambiguous delivery slot quarantined rather than advancing to the next ticket automatically.

**Why:** A late completion acknowledgement without a per-job identity can otherwise acknowledge a different ticket. Likewise, do not backfill historical paid orders when registering a new kitchen printer.

**How to apply:** Staff resolution of ambiguous printing must retire the old authentication generation and require clearing pending hardware requests before configuring the replacement credential. Do not simplify this into an ordinary reprint.

**Why:** Credential retirement rejects already-authenticated stale requests, but cannot distinguish an old completion that firmware resends using new credentials. Hardware clearing is part of the safety contract.