---
name: External payment reconciliation
description: Durable consistency rules for Square payment actions that cross the provider/database boundary.
---

Treat provider confirmation and local finalization as separate failure domains. Once Square confirms a cancellation or refund, the local payment, order, inventory, history, and audit effects must finalize atomically and be safe to retry.

**Why:** A process can fail after the provider accepts an action but before local records finish. Rejecting a retry based only on local status can strand orders or inventory, while loose webhook matching can attribute money movement to the wrong request.

**How to apply:** Correlate events only with persisted provider IDs, expose pending states without claiming success, and derive provider idempotency from a durable order/request identity. Repeated requests may repair only pending, unvoided attempts; never resume payment for a canceled/restocked order. Keep finalization under a database lock/unique invariant so retries cannot repeat financial or inventory changes. Installed kiosk clients must persist an outcome-uncertain lock before sending a payment request, require proof that persistence succeeded, survive process restarts, and clear only after authoritative paid or canceled reconciliation.

For simulated browser payment checks, isolate the entire checkout API surface and count unique requests with fresh instrumentation before diagnosing duplicate submissions.

**Why:** Live bootstrap/status reads hit rate limits during otherwise mocked wallet tests, and accumulated request listeners falsely reported a duplicate POST. Neither was a payment-code failure.

**How to apply:** Mock configuration, provider SDK, order submission, recovery, and fulfillment status together. Use fresh contexts and reset counters per scenario; distinguish native fetches from duplicated logging. Mock success does not establish real-device wallet authorization or production domain readiness.