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
- **Database**: External PostgreSQL on Render, accessed via `EXTERNAL_DATABASE_URL` env var (not the Replit-managed `DATABASE_URL`)
- **Prisma schema**: `Api/prisma/schema.prisma` — uses `EXTERNAL_DATABASE_URL`
- **API config**: `Api/src/config/index.ts` — default port 8000
- **Stripe**: Optional — API starts without `STRIPE_SECRET_KEY` (payment routes will fail gracefully with a clear error)
- **Storage**: Cloudflare R2 for media assets
- **Email**: Resend for transactional emails

## Workflows
- **Admin Panel** — Vite admin dashboard (port 5000, webview) — main UI
- **API Server** — Express API (port 8000, console)
- **Frontend** — Next.js storefront (port 3000, console)

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
- **Galleries**: Photo gallery management with:
  - Gallery CRUD (name, slug, description, visibility toggle, display order)
  - Image management per gallery (add/edit/remove images with title, description, sort order)
  - Images linked to MediaAsset records from Media Library
  - DB models: `Gallery` (table `galleries`), `GalleryImage` (table `gallery_images`)
  - API: `Api/src/modules/galleries/` at `/api/v1/galleries` (admin) and `/api/v1/galleries/public` (public)
  - Admin UI: `Admin.Web/src/pages/pre-built/galleries/AdminGalleryList.jsx`
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
  - Prisma model: `SitePage` (table `site_pages`) with title, slug, bodyHtml, headerMediaAssetId (linked to MediaAsset), SEO fields, display toggles
  - Display toggles: isPublished, passwordProtected, includeInSitemap, includeInTopMenu, includeInFooterColumn1/2/3, displayOrder
  - API: Full CRUD at `/api/v1/pages` (all admin-only) — list (paginated + search), get by ID, create, update (PATCH), soft-delete
  - Admin UI: `AdminPageList.jsx` with list table (boolean columns shown as check/cross icons), Add/Edit modals with TinyMCE rich text editor, delete confirmation
  - Route: `/site-pages` (avoids conflict with demo `/pages` routes)
- **Dashboard (Homepage)** (`/`): NopCommerce-style store overview dashboard
  - Common Statistics: 4 large colored circle-icon cards (Orders, Pending Returns, Registered Customers, Low Stock) with "More info" links
  - Orders chart: Line chart with Day/Week/Month toggles for `orders_count` timeseries
  - New Customers chart: Line chart with Day/Week/Month toggles for `new_customers` timeseries
  - Order Totals table: Status rows (Pending, Processing, Complete, Cancelled) × time columns (Today, This Week, This Month, This Year, All Time)
  - Incomplete Orders panel: Unpaid orders, not-yet-shipped orders, incomplete orders (amount + count + view link)
  - Latest Orders table: 5 most recent orders with status badge, customer name, date, view link
  - Bestsellers by Quantity: Top 5 products sorted by qty sold
  - Bestsellers by Amount: Top 5 products sorted by revenue
  - API endpoints: `/common-stats`, `/order-totals`, `/incomplete-orders`, `/timeseries`, `/top-products?sortBy=quantity|amount`, orders list
- **Metrics & KPIs** (`/metrics`): Detailed analytics page
  - 8 summary cards (gross/net sales, orders, discounts, tax, shipping, refunds, new customers)
  - Timeseries chart with metric key selector dropdown (8 available metrics)
  - Top Products table with adjustable limit (5/10/25/50)
  - Open Orders doughnut chart with status legend
  - Date range selector (7d / 30d)
  - File: `Admin.Web/src/pages/pre-built/metrics/AdminMetricsPage.jsx`
- **Media Upload with Auto-Resize**: `POST /api/v1/media/upload-resized` — accepts `file`, `folder`, and `name` fields
  - Blog uploads (`folder=blog`): 4 variants — xlarge (1018×657), large (1018×622), medium (349×213), small (80×80)
  - Page uploads (`folder=topics` or `pages`): 1 variant — xlarge (1200×346)
  - Carousel uploads (`folder=carousel`): 1 variant — xlarge (1300×480)
  - Naming: `{slugified_name}_{uid}_{suffix}{ext}` — collision-safe with 8-char UUID prefix
  - Returns `{ primary: MediaAsset, variants: [{ suffix, id, url }] }`
  - Image-only (rejects video mimetypes)
  - Utility: `Api/src/lib/imageResize.ts` — sharp-based resize with cover fit
- **Inventory, Orders, Media, Templates, Audit Logs**: Various admin tools

## Frontend.WEB (Storefront)
- **API client**: `Frontend.WEB/src/lib/api.ts` — fetch wrapper with `apiGet`, `apiPost`, `apiPatch`, `apiDelete`
- **Shared types**: `Frontend.WEB/src/types/api.ts` — `Product`, `Category`, `Brand`, `ContentPost`, `CarouselSlide`, etc.
- **Helper functions**: `getProductImage()`, `getProductSlug()`, `formatPrice()` in types/api.ts
- **Environment**: `NEXT_PUBLIC_API_URL` env var (defaults to `http://localhost:8000/api/v1`)
- **Pages wired to API**: Homepage (featured products, bestsellers, blog, carousel), Shop listing (categories, brands, filtering, pagination), Product detail (images, variants, attributes, add-to-cart), Header (dynamic categories, live search), Blog grid (`/blog`)
- **Carousel**: `BannerOne.tsx` — fetches from `/carousel/public`, renders slides with CDN images (1300×480), gradient text overlay, nav arrows; responsive (480px desktop, 320px tablet, 260px mobile); styles in `globals.css` with `jpig-carousel-*` classes
- **Blog detail**: `[slug]/page.tsx` — fetches single post via `/content/:slug`, renders featured image, excerpt, full body HTML, author info, tags, social share; sidebar has categories, latest posts, tag cloud; `ContentPost` type includes `authorUser` field; comment section at bottom via `BlogComments` component
- **Blog comments**: `src/components/blog/BlogComments.tsx` — fetches/displays approved comments with replies, submit form (auth-gated), reply to individual comments. API: `GET/POST /content/comments/:postId`, `DELETE /content/comments/:postId/:commentId`. Prisma model: `ContentComment` with self-referencing parent/replies
- **Product routing**: Uses product `id` as the slug (e.g., `/shop/[id]`)
- **Auth system**: `src/lib/auth.ts` (API calls), `src/context/AuthContext.tsx` (React context with `useAuth()` hook), tokens stored in localStorage (`jpig_access_token`, `jpig_refresh_token`, `jpig_user_id`). Pages: `/login`, `/register`, `/forgot-password`, `/reset-password?token=xxx`
- **Account page**: `src/app/(inner)/account/Accordion.tsx` — auth-gated, live API data via `src/lib/account.ts`. Tabs: Dashboard (greeting, member since, order/review counts), Orders (paginated table, expandable line items, invoice modal with print), Track Order, My Address, Account Details (avatar upload + profile edit + password change), Subscriptions (email/SMS toggles via contact preferences API), Reviews (paginated review cards with star ratings). Types: `UserProfile`, `UserAddress`, `ContactPreference`, `ShopOrder`, `OrderInvoice`, `UserReview` in `types/api.ts`
- **Avatar system**: Users upload avatar via Account Details tab → `POST /api/v1/users/me/avatar` → stored in R2 `avatars/` folder → `avatarUrl` saved on `SiteUser` record → rendered in account page and blog comments. Fallback: initials-based avatar circle
- **Image handling**: Components detect CDN URLs (starting with `http`) vs local static paths

## Dev Notes
- Admin Panel proxies `/api` and `/uploads` requests to the API at `localhost:8000`
- CORS origins default includes `localhost:3000,localhost:5000` (frontend + admin)
- Zod schemas use `z.string().min(1)` instead of `z.string().uuid()` for entity IDs (DB uses human-readable string IDs)
- BigInt `fileSizeBytes` from Prisma must be serialized to Number before JSON responses (done in media + carousel repos)
