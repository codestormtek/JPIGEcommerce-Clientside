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

**Catering quotes are the exception to opt-in gating:** catering quote-status texts go
straight to the quote's `customerPhone` (no opt-in table check), because submitters can
be guests with no account and they supply the phone specifically to receive updates on
that quote — transactional consent. Same transition-guard rule still applies (only fire
when status actually changed). Keep this distinction: do NOT gate catering quote texts on
optInSms, and do NOT remove opt-in gating from registered-user order texts.
