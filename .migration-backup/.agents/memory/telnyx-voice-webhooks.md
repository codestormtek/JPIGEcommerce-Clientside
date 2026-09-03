---
name: Telnyx TeXML voice webhooks
description: How inbound 1-800 call forwarding + voicemail is wired, and why the callback endpoints are token-signed
---

# Telnyx TeXML voice (1-800 forwarding + voicemail)

The toll-free number's inbound calls hit a TeXML application whose Voice webhook
points at our `/api/v1/telnyx/voice` endpoint. That endpoint returns TeXML that
`<Dial>`s the forward number; an `action` callback then routes unanswered calls
to a `<Record>` voicemail flow, and the recording callback emails the recording
via Resend.

## Token-signed callback URLs (security decision)
All `/api/v1/telnyx/*` routes are **exempt from the global rate limiter** (Telnyx
webhooks share IPs and bursts during a call must not be dropped). The voicemail
recording callback **sends email**, so an exempt + unauthenticated endpoint is a
spam/forgery vector.

**Rule:** any self-generated TeXML `action` callback URL that causes a side effect
(email, DB write) must carry a secret token query param (`?k=`) derived from a
server-only secret, verified with `crypto.timingSafeEqual` before doing the work.
We generate the action URLs ourselves, Telnyx echoes them back verbatim, so the
token round-trips without any Telnyx-portal configuration.

**Why:** Telnyx TeXML action callbacks don't carry a usable per-request signature
in our setup, and full Ed25519 verification needs the raw body (we use
`express.urlencoded`). The self-signed-URL token is the pragmatic equivalent.

**How to apply:** token = sha256(`telnyx-voice:` + (TELNYX_WEBHOOK_TOKEN || TELNYX_API_KEY)).
If you add new side-effecting TeXML callbacks, append `?k=token` to their action
URLs and reject mismatches with 403.

## Tuning gotcha
The forward `<Dial timeout>` is kept **below** the cell's own voicemail pickup
(~25s) so OUR business voicemail catches unanswered calls instead of the cell's
personal voicemail bridging the call (which would register as `completed`).
