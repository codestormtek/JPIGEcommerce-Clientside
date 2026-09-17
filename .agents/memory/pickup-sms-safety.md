---
name: Pickup SMS safety
description: Consent, provider activation, and uncertain-delivery constraints for guest pickup texts.
---

Guest pickup SMS consent belongs to an individual order, never the shared guest account. Do not infer consent from a required contact phone or backfill texts to historical orders.

**Why:** Multiple unrelated customers use the same internal pickup user, and providing an order-contact number does not enroll a customer in messaging.

**How to apply:** Keep transactional messaging explicitly opt-in, preserve consent on request replay, and honor phone-level STOP suppression across sends from the same business sender.

Do not enable pickup sending merely because an API credential exists. Confirm the deployed signed webhook, provider approval for the actual number type, and STOP/HELP behavior first.

**Why:** An active two-way number is not evidence of carrier approval or correctly configured opt-out handling. Provider acceptance and delivery are distinct, and a timeout may mean a message was already accepted.

**How to apply:** Keep missing-readiness paths disabled. Quarantine ambiguous sends rather than blindly retrying; use durable delivery events and controlled operator tests before activation.