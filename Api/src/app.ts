import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

// ─── Module Routers (imported as they are built) ──────────────────────────────
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { productsRouter } from './modules/products/products.routes';
import { ordersRouter } from './modules/orders/orders.routes';
import { cartRouter } from './modules/cart/cart.routes';
import { promotionsRouter } from './modules/promotions/promotions.routes';
import { menusRouter } from './modules/menus/menus.routes';
import { mediaRouter } from './modules/media/media.routes';
import { contentRouter } from './modules/content/content.routes';
import { locationsRouter } from './modules/locations/locations.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { subscribersRouter } from './modules/subscribers/subscribers.routes';
import { recipesRouter } from './modules/recipes/recipes.routes';
import { auditLogsRouter } from './modules/audit-logs/audit-logs.routes';
import { paymentsRouter } from './modules/payments/payments.routes';
import { shipmentsRouter } from './modules/shipments/shipments.routes';
import { filesRouter } from './modules/files/files.routes';
import { exportsRouter } from './modules/exports/exports.routes';
import { dashboardsRouter } from './modules/dashboards/dashboards.routes';
import { metricsRouter } from './modules/metrics/metrics.routes';
import { messageTemplatesRouter } from './modules/message-templates/message-templates.routes';
import { inventoryRouter } from './modules/inventory/inventory.routes';
import { checklistsRouter } from './modules/checklists/checklists.routes';
import { carouselRouter } from './modules/carousel/carousel.routes';
import { scheduledTasksRouter } from './modules/scheduledTasks/scheduledTasks.routes';

const app = express();

app.set('trust proxy', 1);

// ─── Security / parsing middleware ────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: config.cors.allowedOrigins,
    credentials: true,
  }),
);
app.use(
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
// Raw body required for webhook signature verification — must come BEFORE express.json()
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));
app.use('/api/v1/notifications/resend-webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static file serving for uploaded assets ──────────────────────────────────
app.use('/uploads', express.static(path.resolve(config.uploads.dir)));

// ─── Request logging (dev) ────────────────────────────────────────────────────
if (config.env !== 'production') {
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.originalUrl}`);
    next();
  });
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: config.env, timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`, authRouter);
app.use(`${API}/users`, usersRouter);
app.use(`${API}/products`, productsRouter);
app.use(`${API}/orders`, ordersRouter);
app.use(`${API}/cart`, cartRouter);
app.use(`${API}/promotions`, promotionsRouter);
app.use(`${API}/menus`, menusRouter);
app.use(`${API}/media`, mediaRouter);
app.use(`${API}/content`, contentRouter);
app.use(`${API}/locations`, locationsRouter);
app.use(`${API}/notifications`, notificationsRouter);
app.use(`${API}/subscribers`, subscribersRouter);
app.use(`${API}/recipes`, recipesRouter);
app.use(`${API}/audit-logs`, auditLogsRouter);
app.use(`${API}/payments`, paymentsRouter);
app.use(`${API}/shipments`, shipmentsRouter);
app.use(`${API}/files`, filesRouter);
app.use(`${API}/exports`, exportsRouter);
app.use(`${API}/admin/dashboards`, dashboardsRouter);
app.use(`${API}/admin/metrics`, metricsRouter);
app.use(`${API}/message-templates`, messageTemplatesRouter);
app.use(`${API}/inventory`, inventoryRouter);
app.use(`${API}/checklists`, checklistsRouter);
app.use(`${API}/carousel`,   carouselRouter);
app.use(`${API}/admin/scheduled-tasks`, scheduledTasksRouter);

// ─── 404 + Global error handler ───────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

