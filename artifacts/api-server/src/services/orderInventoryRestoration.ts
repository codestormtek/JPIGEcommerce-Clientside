import type { Prisma } from '@prisma/client';

type ReservedSku = { productItemId: string; qty: number };

/** Accept only the narrow JSON shape written by order placement. */
export function reservationLedger(value: unknown): ReservedSku[] | null {
  if (!Array.isArray(value)) return null;
  const rows: ReservedSku[] = [];
  for (const row of value) {
    const candidate = row as Record<string, unknown>;
    if (
      !row
      || typeof row !== 'object'
      || typeof candidate.productItemId !== 'string'
      || !Number.isSafeInteger(candidate.qty)
      || (candidate.qty as number) <= 0
    ) return null;
    rows.push({
      productItemId: candidate.productItemId,
      qty: candidate.qty as number,
    });
  }
  return rows;
}

/**
 * The only permitted restock path for an unpaid kiosk order.  The advisory
 * lock and unique orderId record are deliberately shared by kiosk polling,
 * kiosk cancellation, staff cancellation, and confirmed refunds.
 */
export type InventoryRestorationTrigger = 'refund' | 'terminal_cancel' | 'kiosk_void';

export async function restoreOrderInventoryOnceTx(
  tx: Prisma.TransactionClient,
  orderId: string,
  trigger: {
    trigger: InventoryRestorationTrigger;
    refundId?: string;
    actorAdminId?: string;
  },
): Promise<boolean> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment_inventory:${orderId}`}))`;
  const existing = await tx.inventoryRestoration.findUnique({ where: { orderId } });
  if (existing) return false;

  // New orders carry the exact reservation ledger, including internal combo
  // side SKUs. A pre-ledger combo cannot be reconstructed safely from display
  // text, so it is deliberately surfaced for staff reconciliation rather than
  // restoring only its main SKU and silently losing side inventory.
  const order = await (tx.shopOrder as any).findUnique({
    where: { id: orderId },
    select: { inventoryReservationJson: true },
  }) as { inventoryReservationJson?: unknown } | null;
  if (!order) return false;
  const ledger = reservationLedger(order.inventoryReservationJson);
  const legacyLines = ledger ? null : await tx.orderLine.findMany({
    where: { orderId },
    select: { productItemId: true, qty: true, sideSelectionsText: true },
  });
  if (legacyLines?.some((line) => line.sideSelectionsText)) {
    throw new Error(`Order ${orderId} has combo side selections but no durable SKU reservation ledger; staff reconciliation is required.`);
  }
  const reservations = ledger ?? legacyLines ?? [];
  for (const line of reservations) {
    await tx.productItem.update({
      where: { id: line.productItemId },
      data: { qtyInStock: { increment: line.qty } },
    });
  }
  await tx.inventoryRestoration.create({
    data: {
      orderId,
      trigger: trigger.trigger,
      refundId: trigger.refundId ?? null,
      actorAdminId: trigger.actorAdminId ?? null,
    },
  });
  return true;
}