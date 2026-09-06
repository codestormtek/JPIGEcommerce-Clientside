-- Append-only, privacy-safe operational telemetry. No request/network,
-- customer, order, payment, provider, or kiosk credential identifiers.
CREATE TABLE "kiosk_analytics_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "kioskDeviceId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "durationMs" INTEGER,
    "productId" TEXT,
    "sideProductId" TEXT,
    "metadata" JSONB NOT NULL,
    CONSTRAINT "kiosk_analytics_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "kiosk_analytics_events_eventType_check" CHECK ("eventType" IN (
      'session_started', 'cart_started', 'cart_abandoned', 'timeout_reset',
      'side_selected', 'side_edit', 'checkout_started', 'checkout_completed',
      'checkout_failed'
    )),
    CONSTRAINT "kiosk_analytics_events_durationMs_check"
      CHECK ("durationMs" IS NULL OR ("durationMs" >= 0 AND "durationMs" <= 86400000))
);

CREATE INDEX "kiosk_analytics_events_occurredAt_idx"
  ON "kiosk_analytics_events"("occurredAt");
CREATE UNIQUE INDEX "kiosk_analytics_events_eventId_key"
  ON "kiosk_analytics_events"("eventId");
CREATE INDEX "kiosk_analytics_events_kioskDeviceId_occurredAt_idx"
  ON "kiosk_analytics_events"("kioskDeviceId", "occurredAt");
CREATE INDEX "kiosk_analytics_events_eventType_occurredAt_idx"
  ON "kiosk_analytics_events"("eventType", "occurredAt");
CREATE INDEX "kiosk_analytics_events_sideProductId_occurredAt_idx"
  ON "kiosk_analytics_events"("sideProductId", "occurredAt");

ALTER TABLE "kiosk_analytics_events" ADD CONSTRAINT "kiosk_analytics_events_kioskDeviceId_fkey"
  FOREIGN KEY ("kioskDeviceId") REFERENCES "kiosk_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kiosk_analytics_events" ADD CONSTRAINT "kiosk_analytics_events_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kiosk_analytics_events" ADD CONSTRAINT "kiosk_analytics_events_sideProductId_fkey"
  FOREIGN KEY ("sideProductId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;