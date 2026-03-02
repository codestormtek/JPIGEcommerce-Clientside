import { ApiError } from '../../utils/apiError';
import { AuditContext, AuditAction, logAudit } from '../../utils/auditLogger';
import { ListShipmentsInput, CreateShipmentInput, UpdateShipmentInput } from './shipments.schema';
import * as repo from './shipments.repository';

// ─── Shipments ────────────────────────────────────────────────────────────────

export async function listShipments(input: ListShipmentsInput) {
  return repo.findShipments(input);
}

export async function getShipmentById(id: string) {
  const shipment = await repo.findShipmentById(id);
  if (!shipment) throw ApiError.notFound('Shipment');
  return shipment;
}

export async function getShipmentByOrderId(orderId: string) {
  const shipment = await repo.findShipmentByOrderId(orderId);
  if (!shipment) throw ApiError.notFound('Shipment');
  return shipment;
}

export async function createShipment(input: CreateShipmentInput, ctx?: AuditContext) {
  const existing = await repo.findShipmentByOrderId(input.orderId);
  if (existing) {
    throw ApiError.conflict('A shipment already exists for this order');
  }

  const shipment = await repo.createShipment(input);

  logAudit({
    action: AuditAction.SHIPMENT_CREATED,
    entityType: 'Shipment',
    entityId: shipment.id,
    afterJson: { orderId: shipment.orderId, status: shipment.status },
    ctx,
  });

  return shipment;
}

export async function updateShipment(id: string, input: UpdateShipmentInput, ctx?: AuditContext) {
  const existing = await repo.findShipmentById(id);
  if (!existing) throw ApiError.notFound('Shipment');

  const updated = await repo.updateShipment(id, input);

  logAudit({
    action: AuditAction.SHIPMENT_UPDATED,
    entityType: 'Shipment',
    entityId: id,
    beforeJson: { status: existing.status, trackingNumber: existing.trackingNumber },
    afterJson: { status: updated.status, trackingNumber: updated.trackingNumber },
    ctx,
  });

  return updated;
}

export async function deleteShipment(id: string, ctx?: AuditContext): Promise<void> {
  const existing = await repo.findShipmentById(id);
  if (!existing) throw ApiError.notFound('Shipment');

  await repo.deleteShipment(id);

  logAudit({
    action: AuditAction.SHIPMENT_DELETED,
    entityType: 'Shipment',
    entityId: id,
    ctx,
  });
}

