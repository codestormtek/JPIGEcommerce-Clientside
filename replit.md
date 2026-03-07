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

## Admin Pages
- **Products**: Full CRUD with brands, categories, attributes, SKUs, images
- **Blog**: CRUD for blog posts with TinyMCE editor, categories, tags, featured images
- **News**: CRUD for news articles (same content API with `postType: "news"`), plus:
  - Article preview modal with full rendered content
  - Email-to-subscribers: sends published articles to opted-in subscribers via Resend
  - Content preview column in list view
- **Menus**: Menu builder with drag-and-drop sections
- **Checklists**: Task list manager
- **Carousel**: Homepage slide management
- **Subscribers**: Subscriber management with global stats (total, email opt-in, SMS opt-in), CRUD, detail view with subscription topics, search by email/phone, filter by opt-in status
- **Customers**: Full customer management inspired by NopCommerce:
  - List page (`/customers`): NopCommerce-style search panel (email, name, active, role, registration date range), paginated table with email, name, role badge, phone, active checkmark, registered date, quick edit modal, add/delete customer, export
  - Detail page (`/customers/:id`): Editable customer info form, orders table with status/totals, addresses table, contact preferences, activity log placeholder
  - API endpoints: `GET /users/:id/orders`, `GET /users/:id/addresses`
- **Scheduled Tasks** (`/scheduled-tasks`): DB-driven task scheduler management:
  - Task list with filters (search, enabled/disabled, category, last status), sortable columns
  - Create/edit modal with task key dropdown (from registered handlers), schedule type (cron/interval/once), timezone, retry settings, timeout, parameters JSON
  - Enable/disable toggle, Run Now, execution history per task, execution detail with logs
  - DB models: `ScheduledTask`, `TaskExecution`, `TaskExecutionLog`
  - API: `Api/src/modules/scheduledTasks/` at `/api/v1/admin/scheduled-tasks`
  - Task handler registry: `Api/src/jobs/taskHandlerRegistry.ts` — maps taskKey to handler functions
  - DB-driven task runner: `Api/src/jobs/taskRunner.ts` — polls every 60s for due tasks, supports concurrency control, retries
  - 5 built-in handlers: autoCancelSweeper, lowStockCheck, logCleanup, dailySalesSummary, aggregateMetrics (auto-seeded on startup)
- **Recipes** (`/recipes`): Full recipe CRUD with:
  - Drag-and-drop ingredient ordering, structured ingredients (name, quantity, unit)
  - Live preview with print, instruction steps, tags
  - Categories include product types: Sauce, Rub, Dry Mix, Drink (with auto-preset serving sizes)
  - **Product Packaging**: For product categories, shows yield (oz), container size selector (4–64oz), serving size (qty + unit), and auto-calculated container count
  - Recipe fields: `yieldOz`, `containerSizeOz`, `servingSizeQty`, `servingSizeUnit`
  - **Recipe–Product Linking**: Many-to-many via `RecipeProductMap` join table; admin editor shows linked products section with search-to-link and unlink; product detail modal has "Recipes" tab showing linked recipes; live preview reflects linked products
  - API: `GET/POST /recipes/:id/products`, `DELETE /recipes/:id/products/:productId`
  - **Nutrition Analysis**: "Analyze Recipe" button in editor triggers USDA FoodData Central API, calculates nutrition per serving size
  - Serving size presets: Sauce=1.5 tbsp, Rub=1 tbsp, Dry Mix=1 tbsp, Drink=8 oz
  - FDA-style nutrition label modal with per-serving values, % Daily Value, container yield summary, ingredient match details
  - Print nutrition label functionality
  - API: `POST /recipes/:id/nutrition/analyze`, `GET /recipes/:id/nutrition`, `DELETE /recipes/:id/nutrition`
  - Service: `Api/src/modules/recipes/nutrition.service.ts` — USDA search, unit→gram conversion, nutrient scaling, container yield calc
- **Pages (Topics)** (`/site-pages`): NopCommerce-style static page management
  - Prisma model: `SitePage` (table `site_pages`) with title, slug, bodyHtml, SEO fields, display toggles
  - Display toggles: isPublished, passwordProtected, includeInSitemap, includeInTopMenu, includeInFooterColumn1/2/3, displayOrder
  - API: Full CRUD at `/api/v1/pages` (all admin-only) — list (paginated + search), get by ID, create, update (PATCH), soft-delete
  - Admin UI: `AdminPageList.jsx` with list table (boolean columns shown as check/cross icons), Add/Edit modals with TinyMCE rich text editor, delete confirmation
  - Route: `/site-pages` (avoids conflict with demo `/pages` routes)
- **Inventory, Orders, Media, Templates, Audit Logs**: Various admin tools

## Dev Notes
- Admin Panel proxies `/api` and `/uploads` requests to the API at `localhost:8000`
- CORS origins default includes `localhost:5000` (admin)
- To re-enable Frontend.WEB later: create a new workflow on a separate port and update Vite back to a non-5000 port
- Zod schemas use `z.string().min(1)` instead of `z.string().uuid()` for entity IDs (DB uses human-readable string IDs)
- BigInt `fileSizeBytes` from Prisma must be serialized to Number before JSON responses (done in media + carousel repos)
