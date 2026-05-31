---
name: SMS A2P / toll-free verification compliance
description: What carrier SMS verification (Telnyx/Grasshopper toll-free) requires in the storefront's privacy policy and terms pages
---

# SMS carrier verification compliance

US carrier A2P/toll-free verification is carrier-level, not provider-specific — switching SMS providers (Twilio etc.) does NOT bypass it. Telnyx "Sent" status = accepted by Telnyx, not delivered; unregistered/unverified A2P is silently filtered by carriers.

**Why:** The Jiggling Pig uses a toll-free number; verification kept getting blocked on policy content + dead URLs. Reviewers click through to the *live public* policy URLs and reject on missing SMS language or 404s.

**How to apply — both storefront pages must carry SMS language:**
- Privacy Policy: needs an explicit mobile-data clause ("No mobile information will be shared with third parties or affiliates for marketing or promotional purposes"), a no-sell/no-share statement incl. SMS registration data, opt-out (STOP/HELP), safeguards sentence, and a direct SMS/privacy contact.
- Terms: needs an SMS program section — message types, "message frequency varies", "message and data rates may apply", sender ID ("sent by The Jiggling Pig, LLC"), "Reply STOP", "Reply HELP", and a visible link to the Privacy Policy.

**URL gotcha:** the real public paths are `/privacy-policy` and `/terms-condition`. The carrier form had been given `/conditions-of-use` and `/privacy-notice`, which 404. Either fix the URLs submitted to the carrier or add redirect routes for those paths.

**Interim channel option:** email broadcast via existing Resend + subscriber email opt-in needs no carrier approval — a viable "reach customers now" channel while verification clears.
