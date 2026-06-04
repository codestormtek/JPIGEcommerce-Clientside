---
name: Order/transactional SMS policy
description: How order lifecycle and checkout SMS must be gated for opt-in + transition correctness
---

# Order / transactional SMS policy

All customer order texts (checkout confirmation AND status-change lifecycle texts)
must be gated on `UserContactPreference.optInSms === true`, resolving the number as
`smsPhone` first, then falling back to the account `phoneNumber`. The shared resolver
lives in the orders module and is the single entry point — do not call `sendSms` to a
customer's number directly from order flows without going through it.

**Why:** Toll-free A2P/TCPA compliance — we only text customers who explicitly opted in
at registration. The checkout "order placed" SMS was *deliberately changed* from
"text anyone with a phone number" to opt-in-gated. Do not revert that to unconditional
sends; legacy users without a `UserContactPreference` row will (correctly) get no text.

**How to apply:** When adding any new order/transactional SMS, gate on the opt-in
resolver. Status-change texts must only fire on an **actual** status transition
(compare previous statusId to the new one) — re-saving the same status must NOT
re-send, or customers get duplicate texts.
