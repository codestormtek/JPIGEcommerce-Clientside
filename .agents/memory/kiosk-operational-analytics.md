---
name: Kiosk operational analytics
description: Privacy and delivery guardrails for measuring kiosk reliability and checkout friction.
---

Kiosk telemetry must use anonymous session identifiers, coarse allowlisted metadata, and aggregate-only reporting. It must never contain customer details, network fingerprints, free-form errors, order IDs, payment IDs, or provider transaction IDs.

**Why:** Operations need trustworthy abandonment and checkout-friction signals without creating a customer-tracking dataset. Brief connectivity failures must not silently bias those metrics, and telemetry must never interfere with an order or payment.

**How to apply:** Queue only sanitized anonymous events, reuse a stable event ID across retries, deduplicate at storage, authenticate device writes, and keep delivery fire-and-forget from the ordering flow. Expose aggregates rather than raw event, session, or device records.