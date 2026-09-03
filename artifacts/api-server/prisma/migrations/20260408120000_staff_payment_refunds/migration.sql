-- Durable staff-initiated Square refunds and one-time order inventory restoration.
-- This migration is for production migration history. Development uses prisma db push.

CREATE TABLE "payment_refunds" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "actorAdminId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRefundId" TEXT,
    "providerStatus" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "idempotencyRequestId" TEXT NOT NULL,
    "restoreInventory" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_refunds_providerRefundId_key" ON "payment_refunds"("providerRefundId");
CREATE UNIQUE INDEX "payment_refunds_idempotencyRequestId_key" ON "payment_refunds"("idempotencyRequestId");
CREATE INDEX "payment_refunds_paymentId_createdAt_idx" ON "payment_refunds"("paymentId", "createdAt");
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_actorAdminId_fkey"
  FOREIGN KEY ("actorAdminId") REFERENCES "site_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "inventory_restorations" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "refundId" TEXT,
    "actorAdminId" TEXT,
    "restoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_restorations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inventory_restorations_orderId_key" ON "inventory_restorations"("orderId");
CREATE UNIQUE INDEX "inventory_restorations_refundId_key" ON "inventory_restorations"("refundId");
ALTER TABLE "inventory_restorations" ADD CONSTRAINT "inventory_restorations_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "shop_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_restorations" ADD CONSTRAINT "inventory_restorations_refundId_fkey"
  FOREIGN KEY ("refundId") REFERENCES "payment_refunds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_restorations" ADD CONSTRAINT "inventory_restorations_actorAdminId_fkey"
  FOREIGN KEY ("actorAdminId") REFERENCES "site_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;