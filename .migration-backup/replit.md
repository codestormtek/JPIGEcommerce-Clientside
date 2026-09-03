# JPIG Solution — Replit Project

## Overview
Full-stack e-commerce monorepo for The Jiggling Pig, migrated from Vercel to Replit.

## Architecture
Three active services:

| Service | Directory | Port | Framework |
|---------|-----------|------|-----------|
| API Server | `Api/` | 8000 | Express + TypeScript + Prisma |
| Admin Panel | `Admin.Web/` | 3001 | Vite + React |
| Frontend | `Frontend.WEB/` | 5000 (webview, main domain) | Next.js + TypeScript |

Dev URLs: Frontend (storefront + `/kiosk`) is on the workspace domain (external port 80 → local 5000); Admin Panel at `:3001`; API at `:8000`.

## Key Configuration
- **Database**: External PostgreSQL on Render, accessed via `EXTERNAL_DATABASE_URL` (NOT the Replit-managed `DATABASE_URL`). Prisma schema: `Api/prisma/schema.prisma`.
- **Stripe**: Optional — API starts without `STRIPE_SECRET_KEY` (payment routes fail gracefully). Square also supported.
- **Shippo**: Shipping rates/labels/tracking via `SHIPPO_API_KEY` + `STORE_SHIP_*` address vars. Falls back to flat-rate without the key.
- **Storage**: Cloudflare R2 for media assets.
- **Email**: Resend for transactional email.
- **SMS**: Telnyx (toll-free 1-800-513-1710) via `TELNYX_API_KEY` + `TELNYX_FROM_NUMBER`. `Api/src/lib/telnyx.ts` `sendSms()` no-ops if keys missing.
- All secrets live in the Replit Secrets panel; non-sensitive config as shared env vars. See `Api/.env.example`.

## Deployment
- Production: API + Frontend on Render, Admin on Cloudflare Pages. Deploy by pushing via the Replit Git pane.
- **Render has its OWN env vars** — set/update them there separately.
- **Production does NOT auto-apply the Prisma schema.** After adding/changing models, sync the prod DB manually (new tables are additive/non-destructive).

## Workflows
- **Admin Panel** — Vite dashboard (port 3001)
- **API Server** — Express API (port 8000, console)
- **Frontend** — Next.js storefront (port 5000, webview — main domain)

## Kiosk (Self-Order)
- **Kiosk app**: `Frontend.WEB/src/app/kiosk` — iPad self-order flow; device token via setup screen or `/kiosk?token=...`. Payments: Square Terminal (paired reader) or on-screen Square Web Payments card.
- **Kiosk menu nav**: no "All" tab; exactly 3 tabs matched by category name (case-insensitive) in `MenuScreen.tsx` — "Jiggling Food Menu" (default, sections: Combo Items / Sides / Other Items / Drinks), "Sides" (flat), "Jiggling Pig Products" (grouped by sub-category — Sauces, Rubs, Fry Mixes, Drinks — with "Other Items" fallback; also picks up orphan products in neither top-level category). If any of the 3 named categories is missing, falls back to showing all categories as tabs.
- **API**: `Api/src/modules/kiosk` — device auth via `X-Kiosk-Token`; daily K-numbers; terminal checkout create/poll/cancel; pairing via Square device codes.
- **Admin**: Kitchen Queue (`/kitchen-queue`, 5s polling, pending→processing→ready_to_ship→delivered) + Kiosk Devices (`/kiosk-devices`, tokens shown once, Terminal pairing UI).
- **Env**: Admin needs `VITE_STOREFRONT_URL` in production (Cloudflare Pages) so generated kiosk setup links point at the storefront domain; dev falls back to the workspace domain without a port (storefront is on external port 80).
- **Rate limits**: kiosk routes are exempt from the global per-IP API limiter and instead have: (1) brute-force guard — 30 *failed* requests per 15 min per IP, bypassed by valid tokens; (2) per-device throughput ceiling — 300 req/min keyed by token; (3) order placement — 6/min. Valid device tokens are cached in-memory 30s (revoke/delete invalidates immediately).
- **Product channel visibility**: `Product.visibility` = `website` | `kiosk` | `both` (default `both`). Public `GET /products` defaults to website+both; `?visibility=all` returns everything (admin list uses it); kiosk menu filters kiosk+both. Admin form "Show On" select + list badges. Note: product detail by ID stays publicly reachable for kiosk-only items (only listings filter).
- **Combo dinners (free sides)**: `Product.comboSideCount` (0 = not a combo) + `Product.comboSideCategoryId` (category sides are chosen from) — set in Admin product form ("Included Free Sides" + "Sides Category"; API enforces count>0 ⇒ category required, count=0 clears category). **Auto-combo by category**: any kiosk product in the category named "Combo Dinners" (case-insensitive) is automatically treated as a combo with 2 sides from the "Sides" category — no per-product setup needed; explicit per-product fields (count>0) override the default. Applied in `kiosk.service` `effectiveComboConfig()` (both menu + order validation). Kiosk shows a side-picker modal (pick exactly N, duplicates OK); chosen sides are free (no pricing/stock effect) and stored as a display snapshot `OrderLine.sideSelectionsText`, built server-side in `kiosk.service` `resolveComboSides()` from validated product IDs (sides must be kiosk-visible + in the combo's category). Website checkout can never supply sides text (internal-only `CheckoutLine` type; zod strips it). Kitchen Queue shows "Sides: …" under each line.
- **Duplicate side upcharge**: `Product.duplicateSideUpcharge` (Decimal, default 0) — set on the *side* product via Admin product form "Duplicate Side Upcharge ($)". If a combo customer picks the same flagged side more than once, each extra pick adds the upcharge to the combo line's per-unit price. Kiosk shows a confirm modal ("Extra X? … upcharge. Proceed?") before adding the duplicate. Pricing is server-authoritative: `resolveComboSides()` computes internal-only `CheckoutLine.sideUpcharge` (zod strips it from clients, same pattern as `sidesText`); `orders.repository` adds it to `unitPriceSnapshot`/`lineTotal`/subtotal; sidesText gets "(+$X.XX upcharge)" appended. Client mirror `sidesUpcharge()`/`cartSubtotal()` in `Frontend.WEB/src/lib/kiosk.ts` is display-only (Menu/Details/Pay screens all use `cartSubtotal`). Dev DB: Mac-n-Cheese has a $1.50 upcharge set for testing.
- **Prod go-live checklist**:
  1. Sync Prisma schema to prod DB (adds `KioskDevice` table + `ShopOrder.kioskOrderNumber`/`kioskDeviceId` + `Product.visibility` + `Product.comboSideCount`/`comboSideCategoryId`/`duplicateSideUpcharge` + `OrderLine.sideSelectionsText` — additive, non-destructive).
  2. Render (API): set `SQUARE_ACCESS_TOKEN` (valid production token), `SQUARE_APPLICATION_ID`, `SQUARE_LOCATION_ID`, `SQUARE_ENVIRONMENT=production`.
  3. Cloudflare Pages (Admin): set `VITE_STOREFRONT_URL=https://<storefront-domain>` and redeploy.
  4. In Admin → Kiosk Devices: create device, open setup link on iPad (Safari → Add to Home Screen for fullscreen), pair Square Terminal if using a reader.

## Admin Pages (Admin.Web)
File Manager (R2-backed, folders/upload/recovery + document generator), Products, Blog, News (+ email-to-subscribers), Menus, Checklists, Carousel, Galleries, Subscribers, Customers, Scheduled Tasks (DB-driven runner), Recipes (+ USDA nutrition analysis, product linking), Pages/Topics, Dashboard, Metrics & KPIs, Site Settings, Widgets, Catering (quote system), Roadside BBQ Live Sessions, SMS Marketing (Broadcast composer + Order Alert Numbers), Inventory, Orders, Media, Templates, Audit Logs.

## Frontend.WEB (Storefront)
- **API client**: `src/lib/api.ts` (`apiGet/apiPost/apiPatch/apiDelete`); shared types in `src/types/api.ts`. Env: `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api/v1`).
- **Pages wired to API**: Homepage, Shop listing + product detail, Blog (grid + detail + comments), Gallery, Catering quote calculator, BBQ Live location page, Account (auth-gated, full order/address/profile/subscription/review tabs).
- **Auth**: `src/lib/auth.ts` + `src/context/AuthContext.tsx`; tokens in localStorage. Pages: `/login`, `/register`, `/forgot-password`, `/reset-password`.
- Product detail is server-fetched in `shop/[slug]/page.tsx` then passed to `ProductDetailClient.tsx` (avoids client-fetch spinner). Components detect CDN URLs (`http`) vs local static paths.

## Dev Notes (gotchas)
- Admin Panel proxies `/api` and `/uploads` to the API at `localhost:8000`.
- CORS origins default to `localhost:3000,localhost:5000` (frontend + admin).
- Entity IDs use `z.string().min(1)` (NOT `z.string().uuid()`) — DB uses human-readable string IDs.
- BigInt `fileSizeBytes` from Prisma must be cast to Number before JSON responses.

## User preferences
- (none recorded yet)
