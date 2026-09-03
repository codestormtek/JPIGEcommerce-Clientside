---
name: Guest checkout security invariants
description: Non-obvious authorization/payment rules for any public (unauthenticated) order or account-claim endpoint
---

# Guest checkout / hybrid-guest security invariants

When a public, unauthenticated endpoint creates orders tied to a "guest shell" user
(find-or-create a SiteUser by email, `isGuest=true`, `isActive=false`), two invariants
are mandatory or you get account-takeover + free-order abuse:

1. **Never bind a guest order to an existing non-guest account.**
   The find-or-create lookup is by email only. If a real (claimed) account already
   exists for that email, an unauthenticated caller could write orders AND persist a
   payment method onto that account. Guard: if a matching user exists and
   `!user.isGuest`, reject (409 conflict, "please sign in") instead of reusing it.
   Only reuse a prior unclaimed guest shell.

2. **Require a payment credential on the public guest endpoint.**
   The shared `checkout()` only charges when a payment input is present, and
   `placeOrder` decrements stock regardless. So an optional-payment public endpoint
   lets anyone create unpaid orders and deplete inventory. Enforce at the schema level
   (zod `.refine`) that guest checkout has `stripePaymentMethodId` OR `squareNonce`.

**Account claim** (set password on a guest order to convert it to a real account):
require the FULL order uuid (a capability returned only to the purchasing client) +
matching email + `isGuest=true` check before flipping credentials. This intentionally
bypasses the admin-approval gate normal registration uses — the purchase proves the
customer is real. Correctness of claim depends on invariant #1 holding.

**Why:** architect review caught both #1 and #2 as severe (broken access control +
unpaid-order/stock abuse) on the first guest-checkout implementation.
