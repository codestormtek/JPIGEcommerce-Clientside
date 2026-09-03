---
name: External payment reconciliation
description: Durable consistency rules for Square payment actions that cross the provider/database boundary.
---

Treat provider confirmation and local finalization as separate failure domains. Once Square confirms a cancellation or refund, the local payment, order, inventory, history, and audit effects must finalize atomically and be safe to retry.

**Why:** A process can fail after the provider accepts an action but before local records finish. Rejecting a retry based only on local status can strand orders or inventory, while loose webhook matching can attribute money movement to the wrong request.

**How to apply:** Correlate events only with persisted provider IDs, expose pending states without claiming success, use a narrow idempotent finalizer under a database lock/unique invariant, and let repeated requests repair incomplete local effects without repeating financial or inventory changes.