---
name: SMS broadcast send/preview consistency
description: Rules for any bulk-send feature (SMS broadcasts, alert campaigns) so preview counts and audit history stay correct
---

# Bulk send: preview vs send + audit consistency

When building any "send to an audience + show history" feature (SMS broadcasts, live-session alerts):

- **Preview count MUST use the exact same target-resolution path as the actual send.**
  - **Why:** Preview counted non-null phones while send trimmed + deduped by phone, so the admin confirmed "N recipients" but fewer were actually texted. Mismatch erodes trust in the count.
  - **How to apply:** Extract a single `resolveTargets()` (trim + dedupe by phone) and call it from both the preview endpoint and the send path.

- **Persist the campaign/broadcast row BEFORE sending, then write each recipient row as it sends; update final status/counts at the end.**
  - **Why:** Original code sent all SMS first, then created the broadcast + recipient rows. A crash mid-way would lose the entire audit trail even though real messages went out.
  - **How to apply:** create broadcast (status `sending`, counts 0) → loop sendSms + create recipient row immediately → `updateBroadcast` with final `sent`/`partial`/`failed` + counts.

- **Known limitation (accepted, matches existing live-session alert pattern):** sending happens synchronously inside the HTTP request loop. Fine for the small food-truck subscriber base; if lists grow large, move to an async job/outbox worker with bounded concurrency + retries. Not done now to avoid over-engineering and to stay consistent with the existing alert-campaign code.
