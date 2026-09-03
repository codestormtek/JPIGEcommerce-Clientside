import type { Prisma } from '@prisma/client';

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

  const lines = await tx.orderLine.findMany({ where: { orderId } });
  for (const line of lines) {
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