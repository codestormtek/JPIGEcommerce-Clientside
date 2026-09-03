---
name: Square payment integration
description: How Square is wired into the JPIG API and checkout, and which env vars are needed
---

## Key decisions

The correct npm package is `square` (v44+), NOT `squareup` (which is an old unofficial library with no useful exports).

**Why:** `squareup` v1.0.0 is a legacy unofficial SDK that exports almost nothing useful. `square` is the official SDK from Square.

## Env vars

### API (Replit Secrets)
- `SQUARE_ACCESS_TOKEN` — production or sandbox token
- `SQUARE_LOCATION_ID` — Square location ID
- `SQUARE_APPLICATION_ID` — Square application ID
- `SQUARE_ENVIRONMENT` — `sandbox` or `production` (defaults to sandbox)
- `SQUARE_WEBHOOK_SIGNATURE_KEY` — for webhook signature verification

### Frontend (Replit Secrets, prefixed NEXT_PUBLIC_)
- `NEXT_PUBLIC_SQUARE_APPLICATION_ID`
- `NEXT_PUBLIC_SQUARE_LOCATION_ID`
- `NEXT_PUBLIC_SQUARE_ENVIRONMENT` — `sandbox` or `production`

## How it works

- `Api/src/lib/square.ts` — lazy singleton SquareClient (reset on credential change)
- `Api/src/services/squareService.ts` — createPayment, refundPayment, verifyWebhookSignature (HMAC-SHA256)
- `Api/src/modules/payment-gateway/` — admin API to get/set active gateway, test Square connection
- Active gateway stored in `SiteSetting` key `active_payment_gateway` (defaults to `stripe`)
- `orders.service.ts` branches: `input.squareNonce` → Square path, `input.paymentMethodTokenId` → Stripe path
- `payments.service.ts` branches capture/refund on `payment.provider` field
- Square webhook at `POST /api/v1/payments/square-webhook` (HMAC verified)

## Checkout frontend flow

- `CheckOutMain.tsx` fetches `active_payment_gateway` on mount
- If square: loads `https://sandbox.web.squarecdn.com/v1/square.js` dynamically, inits card via `Square.payments(appId, locationId)`
- On submit: `card.tokenize()` → gets nonce → sends as `squareNonce` in order POST
- If stripe: existing Stripe Elements flow unchanged

## Build-check gotcha (IMPORTANT)

Replit dev workflows run `ts-node-dev --transpile-only` (API) and Next dev (Frontend), which SKIP type checking. Render builds with real `tsc` (`npm run build` → `tsc`). So type errors pass locally but fail the Render deploy.
**Always run `npx tsc --noEmit` in both `Api/` and `Frontend.WEB/` before telling the user to push/deploy.**

### Square SDK v44 correct API shapes
- Payments: `client.payments.create({...})` — NOT `createPayment`. Awaited result has `.payment`.
- Refunds: `client.refunds.refundPayment({...})` — this one IS `refundPayment`. Result has `.refund`.
- `amountMoney.currency` must be typed `Square.Currency` (string-literal union), not plain string — cast `currency.toUpperCase() as Square.Currency`. Import `import type { Square } from 'square'`.
- `Money.amount` is `bigint | null | undefined`; coalesce null → undefined when narrowing to `bigint | undefined`.
- Frontend: `HTMLScriptElement` has no `.complete` property (that's HTMLImageElement); use `readyState === 'complete'` or `window.Square` presence to detect a loaded script.

## Payment gateway admin UI

- Route: `/payment-gateway` in admin panel (port 3001)
- Sidebar: under System section
- API: `GET /api/v1/admin/payment-gateway/status`, `POST /`, `POST /test`
- Square credentials entered in UI are applied to process.env (session-only); permanent creds need Replit Secrets

## Storefront gateway switch: read settingValue, not the record
The public endpoint `GET /site-settings/public/:key` returns the FULL record (`{success, data:{settingValue, settingKey, ...}}`), NOT a bare string. The frontend `apiFetch` returns the whole body, so `res.data` is the object. Reading the active gateway must use `res.data.settingValue === 'square'` — an earlier bug compared `res.data === 'square'` (object vs string, always false), so checkout never switched to Square no matter the toggle/env. The keyless `GET /site-settings/public` instead returns a flat key→value map.

## Storefront "Initializing secure payment…" spinner hangs forever
The Square Web SDK card form gets stuck on the loading spinner when init silently fails. Real causes, in order of likelihood: (1) `NEXT_PUBLIC_SQUARE_APPLICATION_ID`/`LOCATION_ID` not set or not baked into the Next.js build (NEXT_PUBLIC_* are build-time — must redeploy with cache cleared after setting); (2) sandbox/production mismatch — a `sandbox-` App ID with `NEXT_PUBLIC_SQUARE_ENVIRONMENT=production` (or vice versa) loads the wrong square.js and throws; (3) wrong/cross-account App ID or Location ID → `payments()`/`card.attach()` throws. The checkout now surfaces each of these as an inline red error instead of an infinite spinner (validates env presence, detects sandbox-prefix mismatch, 10s load timeout, shows the caught SDK error message).

## Server-side charge returns 401 AUTHENTICATION_ERROR / UNAUTHORIZED
After the browser card form tokenizes fine, the API's Square charge can still 401. Causes: (1) `SQUARE_ACCESS_TOKEN` is a sandbox token while `SQUARE_ENVIRONMENT=production` (or vice versa) — token and environment must match and come from the SAME app's Production credentials as the App ID; (2) a trailing newline/space on `SQUARE_ENVIRONMENT` makes `env === 'production'` false, so the SDK silently hits the sandbox endpoint with a prod token → 401; (3) stray char on the access token. The API Square client (`Api/src/lib/square.ts`) now `.trim()`s both, but the values themselves must still match. NOTE: the client is a cached singleton — the API must be restarted/redeployed after changing these env vars.

## Catalog sync: updates need live version + real variation id
`catalog.object.upsert` on an EXISTING catalog object is rejected without the current `version`, and temporary `#...` client ids are create-only. For updates: `catalog.object.get({objectId})` first, then upsert with the live item id+version and the first variation's real id+version; on 404 (deleted in Square) fall back to fresh `#` client ids to recreate. Keep sync fire-and-forget so product saves never fail on Square errors.

## Charge 400 VALUE_TOO_LONG on idempotency_key
Square caps `idempotency_key` at 45 chars. The app's order IDs are long human-readable strings, so `${orderId}-${Date.now()}` exceeds 45 and Square rejects with 400 INVALID_REQUEST_ERROR. Fix: use `crypto.randomUUID()` (36 chars) for both payment create and refund in `Api/src/services/squareService.ts`.
