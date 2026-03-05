# JPIG Solution — Replit Project

## Overview
Full-stack e-commerce monorepo for The Jiggling Pig, migrated from Vercel to Replit.

## Architecture
Two active services (Frontend.WEB paused for now):

| Service | Directory | Port | Framework |
|---------|-----------|------|-----------|
| API Server | `Api/` | 8000 | Express + TypeScript + Prisma |
| Admin Panel | `Admin.Web/` | 5000 (webview) | Vite + React |
| Frontend (paused) | `Frontend.WEB/` | — | Next.js 16 |

## Key Configuration
- **Database**: External PostgreSQL on Render, accessed via `EXTERNAL_DATABASE_URL` env var (not the Replit-managed `DATABASE_URL`)
- **Prisma schema**: `Api/prisma/schema.prisma` — uses `EXTERNAL_DATABASE_URL`
- **API config**: `Api/src/config/index.ts` — default port 8000
- **Stripe**: Optional — API starts without `STRIPE_SECRET_KEY` (payment routes will fail gracefully with a clear error)
- **Storage**: Cloudflare R2 for media assets
- **Email**: Resend for transactional emails

## Workflows
- **Admin Panel** — Vite admin dashboard (port 5000, webview) — main UI
- **API Server** — Express API (port 8000, console)

## Environment Variables
All secrets managed via Replit Secrets panel. Non-sensitive config set as shared env vars. See `Api/.env.example` for the full list of variables.

## Dev Notes
- Admin Panel proxies `/api` and `/uploads` requests to the API at `localhost:8000`
- CORS origins default includes `localhost:5000` (admin)
- To re-enable Frontend.WEB later: create a new workflow on a separate port and update Vite back to a non-5000 port
