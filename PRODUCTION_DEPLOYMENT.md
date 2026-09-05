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

The updated kiosk client is in `artifacts/jiggling-pig`. Release it only after
the Render API campaign endpoint is live. Its production environment must route
`/api/v1` requests to `https://api.thejigglingpig.com`.