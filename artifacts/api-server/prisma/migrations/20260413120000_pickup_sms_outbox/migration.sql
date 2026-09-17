-- Pickup guest transactional SMS consent, suppression, and at-least-once
-- outbox. This is additive and intentionally not applied by application boot.

CREATE TABLE "pickup_sms_consents" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "optedIn" BOOLEAN NOT NULL DEFAULT false,
    "consentCapturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentedAt" TIMESTAMP(3),
    "consentVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pickup_sms_consents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pickup_sms_consents_orderId_key" ON "pickup_sms_consents"("orderId");
CREATE INDEX "pickup_sms_consents_phoneNumber_idx" ON "pickup_sms_consents"("phoneNumber");
ALTER TABLE "pickup_sms_consents"
  ADD CONSTRAINT "pickup_sms_consents_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "shop_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "pickup_sms_suppressions" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "suppressedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'inbound_stop',
    "reason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pickup_sms_suppressions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pickup_sms_suppressions_phoneNumber_key"
  ON "pickup_sms_suppressions"("phoneNumber");

CREATE TABLE "pickup_sms_outbox" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "messageBody" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "consentCapturedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "providerMessageId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "uncertainAt" TIMESTAMP(3),
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    CONSTRAINT "pickup_sms_outbox_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pickup_sms_outbox_orderId_eventType_key"
  ON "pickup_sms_outbox"("orderId", "eventType");
CREATE INDEX "pickup_sms_outbox_status_nextAttemptAt_createdAt_idx"
  ON "pickup_sms_outbox"("status", "nextAttemptAt", "createdAt");
CREATE INDEX "pickup_sms_outbox_providerMessageId_idx"
  ON "pickup_sms_outbox"("providerMessageId");
ALTER TABLE "pickup_sms_outbox"
  ADD CONSTRAINT "pickup_sms_outbox_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "shop_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "pickup_sms_webhook_events" (
    "id" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "payloadJson" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processingResult" TEXT,
    CONSTRAINT "pickup_sms_webhook_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pickup_sms_webhook_events_providerEventId_key"
  ON "pickup_sms_webhook_events"("providerEventId");
CREATE INDEX "pickup_sms_webhook_events_providerMessageId_processedAt_idx"
  ON "pickup_sms_webhook_events"("providerMessageId", "processedAt");