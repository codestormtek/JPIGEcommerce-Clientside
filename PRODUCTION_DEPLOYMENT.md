# Jiggling Pig production deployment

The production stack is released from the `main` branch of
`codestormtek/JPIGEcommerce-Clientside`.

## Render API

The API source now lives in `artifacts/api-server`, inside the pnpm workspace.
Configure the existing Render API service as follows:

- Root directory: repository root
- Runtime: Node
- Build command:

  ```sh
  corepack enable && pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run prisma:generate && pnpm --filter @workspace/api-server run build && pnpm --filter @workspace/api-server run prisma:migrate:deploy
  ```

- Start command:

  ```sh
  pnpm --filter @workspace/api-server run start
  ```

- Health check path: `/api/healthz`
- Production branch: `main`
- Auto-deploy: enabled

Keep the existing production environment variables and secrets on the Render
service. In particular, `EXTERNAL_DATABASE_URL` must be available during the
build so `prisma migrate deploy` can apply new migrations before the new server
starts. Do not store secret values in Git.

After deployment, an unauthenticated request to
`https://api.thejigglingpig.com/api/v1/kiosk/campaigns` should return `401`, not
`404`. A `401` confirms the route exists and is protected.

## Cloudflare Pages admin

The Git-tracked Vite admin source is currently retained at
`.migration-backup/Admin.Web`. Configure the existing Cloudflare Pages admin
project as follows:

- Root directory: `.migration-backup/Admin.Web`
- Build command: `npm ci && npm run build`
- Build output directory: `dist`
- Production branch: `main`
- Environment variable:
  `VITE_API_BASE_URL=https://api.thejigglingpig.com`

Keep the existing custom domain `admin.thejigglingpig.com` attached to this
Pages project. Deploy the Render API first, then trigger the Cloudflare Pages
deployment.

After deployment:

1. Sign in at `https://admin.thejigglingpig.com`.
2. Open **Kiosk → Kiosk Marketing**.
3. Confirm the existing Tea & Drink campaign appears.
4. Create an inactive test campaign, edit it, and delete it.
5. Upload a post-sale graphic and confirm it is selected immediately.

## Storefront and kiosk

### Smart Links, phone pickup, and kitchen printers

The existing Cloudflare admin portal now owns these management routes:

- `/smart-links`: destinations, QR/sign exports, NFC URLs, configuration, and visit history.
- `/pickup`: event, menu, wait estimate, tax, and ordering availability.
- `/kitchen-printers`: CloudPRNT setup, ticket history, and controlled reprints.

The customer website retains `/go/[slug]` and `/pickup` for scanning,
menu browsing, ordering, and payment. Its former management URLs
`/admin/smart-links`, `/admin/pickup`, and `/admin/kitchen-printers`
redirect to the matching portal routes. Release the updated admin before
releasing those storefront redirects. Do not substitute the customer
website's login for the portal's existing authentication.

The portal port has been checked using isolated browser fixtures, not live
payments or printer operations. Validate authenticated live reads separately;
physical printing and payment tests need a controlled, approved test window.

The updated kiosk client is in `artifacts/jiggling-pig`. Release it only after
the Render API campaign endpoint is live. Its production environment must route
`/api/v1` requests to `https://api.thejigglingpig.com`.

### Optional guest pickup SMS readiness

Guest pickup confirmation/ready texts are disabled unless all of the following
are true in the API production environment:

- `PICKUP_SMS_ENABLED=true`
- `PICKUP_SMS_PROVIDER_READY=true` after provider setup is explicitly approved
- `TELNYX_PUBLIC_KEY` contains the current Telnyx Ed25519 webhook verification
  key (the key from the Telnyx portal/API Keys, not a signing-secret guess)
- Telnyx has an approved A2P/toll-free two-way sender and the messaging profile
  has HELP/STOP handling reviewed. Do not assume either is configured.

The profile callback remains `https://api.thejigglingpig.com/webhooks/telnyx/sms`.
Do not enable the feature before the additive pickup-SMS migration is applied
and a controlled signed-webhook test has passed. Development never sends live
pickup SMS.

### Square web-wallet production setup

The storefront contains Square's current public Apple Pay domain-association
file at:

```text
artifacts/jiggling-pig/public/.well-known/apple-developer-merchantid-domain-association
```

Next.js serves that file without an application route. Deploy the storefront to
Render before asking Square to validate a domain, then confirm each checkout
hostname returns the unmodified, extensionless file over HTTPS with a `200`
response:

```sh
curl --fail --location \
  https://thejigglingpig.com/.well-known/apple-developer-merchantid-domain-association
curl --fail --location \
  https://www.thejigglingpig.com/.well-known/apple-developer-merchantid-domain-association
```

Register only hostnames that actually serve a page which initializes Apple Pay.
If checkout can be reached on both `thejigglingpig.com` and
`www.thejigglingpig.com`, validate and register both; do not treat one hostname
as covering the other. Confirm both custom domains and their TLS certificates
are active on the Render storefront first. This setup is separate from the
Render API service and from Replit previews.

For each actual production checkout hostname:

1. Open the [Square Developer Console](https://developer.squareup.com/apps) and
   select the application used by the storefront's Web Payments SDK integration.
2. Switch the application to **Production** mode.
3. Select **Apple Pay** in the left pane.
4. Choose **Add Domain** and enter the hostname exactly as served (no scheme or
   path), then follow Square's validation instructions.
5. Confirm Square reports the domain as enabled before exposing Apple Pay at
   checkout. Registration is an operator action; deployment does not perform it.

Production checkout must use `https://web.squarecdn.com/v1/square.js` and the
selected application's production application ID and production location ID.
Keep secret payment credentials on the API service; do not add them to the
storefront or this file. Square recommends buyer verification/SCA for all
customer-initiated transactions, including digital wallets.

Google Pay does not use the Apple domain-association file, and Square's Web
Payments Google Pay guide does not specify a separate Square domain-registration
step. It does require HTTPS and a supported browser (Chrome, Firefox, Safari,
Edge, Opera, or UCWeb). Before enabling it in production, use the production
Square SDK URL and production application/location IDs, comply with the
[Google Pay API Terms of Service](https://payments.developers.google.com/terms/sellertos),
[Acceptable Use Policy](https://payments.developers.google.com/terms/aup), and
[brand guidelines](https://developers.google.com/pay/api/web/guides/brand-guidelines),
and verify the storefront's secure-context and Content Security Policy setup.
WebViews require the additional configuration described by Square rather than
being assumed to work like a normal browser.

References:

- [Square Apple Pay for Web Payments](https://developer.squareup.com/docs/web-payments/apple-pay)
- [Square Apple Pay domain API reference](https://developer.squareup.com/reference/square/apple-pay-api/register-domain)
- [Square Google Pay for Web Payments](https://developer.squareup.com/docs/web-payments/google-pay)
- [Square Web Payments security requirements](https://developer.squareup.com/docs/web-payments/overview)