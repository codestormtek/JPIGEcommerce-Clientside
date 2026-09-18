---
name: Shared staff order notifications
description: Product decision and rollout constraints for kiosk and remote-pickup staff alerts.
---

Use the existing kiosk staff workflow for paid remote pickup orders, including wallet payments. Extend the existing email, staff SMS recipients, phone-app queue/push, and kitchen channels instead of introducing another staff app or administration site.

**Why:** The user explicitly confirmed that remote payments should follow the kiosk workflow and that staff need email and text alongside the Kitchen/Payment phone app.

**How to apply:** Preserve existing kiosk alert behavior during staged deployment. Keep staff recipients separate from customer SMS consent. Snapshot recipients at the new paid event, not during later status polling; enabling a channel or adding a phone must not alert staff about historical orders. Provider acceptance is not proof of delivery or acknowledgment, and uncertain sends must not be blindly retried.