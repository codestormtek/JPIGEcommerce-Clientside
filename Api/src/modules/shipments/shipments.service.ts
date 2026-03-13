import { ApiError } from '../../utils/apiError';
import { AuditContext, AuditAction, logAudit } from '../../utils/auditLogger';
import { ListShipmentsInput, CreateShipmentInput, UpdateShipmentInput, PurchaseLabelInput } from './shipments.schema';
import * as repo from './shipments.repository';
import * as shippoService from '../../services/shippoService';
import { config } from '../../config';
import prisma from '../../lib/prisma';

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

// ─── Purchase Label via Shippo ────────────────────────────────────────────────

export async function purchaseShippoLabel(id: string, input: PurchaseLabelInput, ctx?: AuditContext) {
  if (!config.shippo.enabled) {
    throw ApiError.badRequest('Shippo is not configured. Please set SHIPPO_API_KEY.');
  }

  const shipment = await repo.findShipmentById(id);
  if (!shipment) throw ApiError.notFound('Shipment');

  if (shipment.labelUrl) {
    throw ApiError.conflict('A label has already been purchased for this shipment.');
  }

  // Determine rate ID: prefer override, then order's stored rate, then error
  const order = await prisma.shopOrder.findUnique({
    where: { id: shipment.orderId },
    select: { shippoRateId: true, shippoCarrier: true },
  });

  const rateId = input.rateId ?? order?.shippoRateId ?? null;
  if (!rateId) {
    throw ApiError.badRequest(
      'No Shippo rate ID found. The customer may have checked out with a flat-rate method. ' +
      'Please provide a rateId to purchase a label.',
    );
  }

  const label = await shippoService.purchaseLabel(rateId);

  const updated = await repo.updateShipmentLabel(id, {
    shippoTransactionId: label.transactionId,
    trackingNumber: label.trackingNumber,
    carrier: label.carrier,
    labelUrl: label.labelUrl,
    labelPdf: label.labelPdf,
    estimatedDelivery: label.eta ? new Date(label.eta) : undefined,
    status: 'shipped',
    shippedAt: new Date(),
  });

  logAudit({
    action: AuditAction.SHIPMENT_UPDATED,
    entityType: 'Shipment',
    entityId: id,
    afterJson: { trackingNumber: label.trackingNumber, carrier: label.carrier, labelUrl: label.labelUrl },
    ctx,
  });

  return updated;
}

