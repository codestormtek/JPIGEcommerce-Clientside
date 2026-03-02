import { Response } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/apiResponse';
import { ctxFromRequest } from '../../utils/auditLogger';
import { ListShipmentsInput, CreateShipmentInput, UpdateShipmentInput } from './shipments.schema';
import * as service from './shipments.service';

// ─── Admin handlers ───────────────────────────────────────────────────────────

// GET /api/v1/shipments
export async function listShipments(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.listShipments(req.query as unknown as ListShipmentsInput);
  sendPaginated(res, result);
}

// GET /api/v1/shipments/:id
export async function getShipmentById(req: AuthRequest, res: Response): Promise<void> {
  const shipment = await service.getShipmentById(req.params['id'] as string);
  sendSuccess(res, shipment);
}

// POST /api/v1/shipments
export async function createShipment(req: AuthRequest, res: Response): Promise<void> {
  const shipment = await service.createShipment(
    req.body as CreateShipmentInput,
    ctxFromRequest(req, req.user?.sub),
  );
  sendCreated(res, shipment, 'Shipment created');
}

// PATCH /api/v1/shipments/:id
export async function updateShipment(req: AuthRequest, res: Response): Promise<void> {
  const shipment = await service.updateShipment(
    req.params['id'] as string,
    req.body as UpdateShipmentInput,
    ctxFromRequest(req, req.user?.sub),
  );
  sendSuccess(res, shipment, 'Shipment updated');
}

// DELETE /api/v1/shipments/:id
export async function deleteShipment(req: AuthRequest, res: Response): Promise<void> {
  await service.deleteShipment(
    req.params['id'] as string,
    ctxFromRequest(req, req.user?.sub),
  );
  sendNoContent(res);
}

// ─── Customer-facing handler ──────────────────────────────────────────────────

// GET /api/v1/shipments/order/:orderId  (authenticated user — own order's shipment)
export async function getShipmentByOrderId(req: AuthRequest, res: Response): Promise<void> {
  const shipment = await service.getShipmentByOrderId(req.params['orderId'] as string);
  sendSuccess(res, shipment);
}

