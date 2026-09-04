-- Staff mobile Expo devices and durable order notification events.

CREATE TABLE "expo_push_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "rolePreference" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "expo_push_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "expo_push_tokens_token_key" ON "expo_push_tokens"("token");
CREATE INDEX "expo_push_tokens_enabled_rolePreference_idx" ON "expo_push_tokens"("enabled", "rolePreference");
ALTER TABLE "expo_push_tokens" ADD CONSTRAINT "expo_push_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "site_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "push_notification_events" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "leaseExpiresAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastError" TEXT,
    CONSTRAINT "push_notification_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_notification_events_orderId_eventType_key"
  ON "push_notification_events"("orderId", "eventType");
CREATE INDEX "push_notification_events_status_createdAt_idx"
  ON "push_notification_events"("status", "createdAt");
CREATE INDEX "push_notification_events_status_nextAttemptAt_idx"
  ON "push_notification_events"("status", "nextAttemptAt");
ALTER TABLE "push_notification_events" ADD CONSTRAINT "push_notification_events_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "shop_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "push_notification_deliveries" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ticketId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseExpiresAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "receiptJson" TEXT,
    "lastError" TEXT,
    CONSTRAINT "push_notification_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "push_notification_deliveries_eventId_token_key"
  ON "push_notification_deliveries"("eventId", "token");
CREATE INDEX "push_notification_deliveries_status_nextAttemptAt_idx"
  ON "push_notification_deliveries"("status", "nextAttemptAt");
CREATE INDEX "push_notification_deliveries_ticketId_idx"
  ON "push_notification_deliveries"("ticketId");
ALTER TABLE "push_notification_deliveries" ADD CONSTRAINT "push_notification_deliveries_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "push_notification_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;