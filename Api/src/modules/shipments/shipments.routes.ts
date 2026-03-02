import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { listShipmentsSchema, createShipmentSchema, updateShipmentSchema } from './shipments.schema';
import * as ctrl from './shipments.controller';

export const shipmentsRouter = Router();

// ─── Customer-facing (static prefix before /:id) ─────────────────────────────

// GET /api/v1/shipments/order/:orderId  — track own shipment
shipmentsRouter.get(
  '/order/:orderId',
  authenticate,
  asyncHandler(ctrl.getShipmentByOrderId),
);

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

// GET    /api/v1/shipments
shipmentsRouter.get(
  '/',
  authenticate,
  authorize('admin'),
  validate(listShipmentsSchema, 'query'),
  asyncHandler(ctrl.listShipments),
);

// POST   /api/v1/shipments
shipmentsRouter.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createShipmentSchema),
  asyncHandler(ctrl.createShipment),
);

// GET    /api/v1/shipments/:id
shipmentsRouter.get(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.getShipmentById),
);

// PATCH  /api/v1/shipments/:id
shipmentsRouter.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(updateShipmentSchema),
  asyncHandler(ctrl.updateShipment),
);

// DELETE /api/v1/shipments/:id
shipmentsRouter.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(ctrl.deleteShipment),
);

