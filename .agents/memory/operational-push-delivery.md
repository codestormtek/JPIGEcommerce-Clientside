---
name: Operational push delivery
description: Reliability and privacy rules for staff-facing order notifications.
---

Operational push notifications must use durable event and per-device delivery records, leased retries, provider ticket and receipt tracking, and periodic reconciliation from source-of-truth order state. Treat network delivery as at least once.

**Why:** A database event alone is not a delivery guarantee. Processes can stop after claiming work or after the provider accepts a request, and Expo can return per-device failures after the initial send response.

**How to apply:** Make logical events unique, reclaim expired leases, retry with limits and backoff, disable invalid device tokens from tickets or receipts, make notification taps auth-aware, revoke tokens before logout, and never place customer PII in lock-screen text.