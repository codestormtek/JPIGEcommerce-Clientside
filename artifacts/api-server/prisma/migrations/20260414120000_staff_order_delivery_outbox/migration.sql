-- Staff paid-order email/SMS delivery outbox. Additive only: deploy this
-- migration before the API build that references it. No historical backfill.
CREATE TABLE "staff_order_deliveries" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "recipientId" TEXT,
    "subject" TEXT,
    "bodyHtml" TEXT,
    "bodyText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "providerMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "unknownAt" TIMESTAMP(3),
    "lastError" TEXT,
    CONSTRAINT "staff_order_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "staff_order_deliveries_orderId_eventType_channel_recipient_key"
  ON "staff_order_deliveries"("orderId", "eventType", "channel", "recipient");
CREATE INDEX "staff_order_deliveries_status_nextAttemptAt_createdAt_idx"
  ON "staff_order_deliveries"("status", "nextAttemptAt", "createdAt");
ALTER TABLE "staff_order_deliveries"
  ADD CONSTRAINT "staff_order_deliveries_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "shop_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;