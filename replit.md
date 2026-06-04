# JPIG Solution — Replit Project

## Overview
Full-stack e-commerce monorepo for The Jiggling Pig, migrated from Vercel to Replit.

## Architecture
Three active services:

| Service | Directory | Port | Framework |
|---------|-----------|------|-----------|
| API Server | `Api/` | 8000 | Express + TypeScript + Prisma |
| Admin Panel | `Admin.Web/` | 5000 (webview) | Vite + React |
| Frontend | `Frontend.WEB/` | 3000 (console) | Next.js 16 + TypeScript |

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
- **Admin Panel** — Vite dashboard (port 5000, webview) — main UI
- **API Server** — Express API (port 8000, console)
- **Frontend** — Next.js storefront (port 3000, console)

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
