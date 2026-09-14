-- Add the durable public pickup idempotency key, Smart Links, and CloudPRNT
-- ticket queue. This migration is additive: it neither alters existing data
-- nor changes an existing column's type or nullability.

ALTER TABLE "shop_orders"
  ADD COLUMN "remotePickupRequestId" TEXT;

-- The precise aggregate SKU reservation is durable so cancellation/refund
-- restores combo-side inventory rather than inferring it from display lines.
ALTER TABLE "shop_orders"
  ADD COLUMN "inventoryReservationJson" JSONB;

CREATE UNIQUE INDEX "shop_orders_remotePickupRequestId_key"
  ON "shop_orders"("remotePickupRequestId");

CREATE TABLE "cloudprnt_printers" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "printerMac" TEXT,
    "printerModel" TEXT,
    "firmwareVersion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "lastError" TEXT,
    CONSTRAINT "cloudprnt_printers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cloudprnt_printers_tokenHash_key"
  ON "cloudprnt_printers"("tokenHash");
CREATE INDEX "cloudprnt_printers_isActive_lastSeenAt_idx"
  ON "cloudprnt_printers"("isActive", "lastSeenAt");

CREATE TABLE "cloudprnt_jobs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "printerId" TEXT NOT NULL,
    "orderId" TEXT,
    "originalJobId" TEXT,
    "dedupeKey" TEXT,
    "ticketKind" TEXT NOT NULL DEFAULT 'order',
    "contentType" TEXT NOT NULL DEFAULT 'text/plain',
    "payloadText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "fetchedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "printedAt" TIMESTAMP(3),
    "lastError" TEXT,
    CONSTRAINT "cloudprnt_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cloudprnt_jobs_dedupeKey_key"
  ON "cloudprnt_jobs"("dedupeKey");
CREATE INDEX "cloudprnt_jobs_printerId_status_createdAt_idx"
  ON "cloudprnt_jobs"("printerId", "status", "createdAt");
CREATE INDEX "cloudprnt_jobs_orderId_idx"
  ON "cloudprnt_jobs"("orderId");

ALTER TABLE "cloudprnt_jobs" ADD CONSTRAINT "cloudprnt_jobs_printerId_fkey"
  FOREIGN KEY ("printerId") REFERENCES "cloudprnt_printers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cloudprnt_jobs" ADD CONSTRAINT "cloudprnt_jobs_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "shop_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cloudprnt_jobs" ADD CONSTRAINT "cloudprnt_jobs_originalJobId_fkey"
  FOREIGN KEY ("originalJobId") REFERENCES "cloudprnt_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "smart_links" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "fallbackUrl" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "smart_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "smart_links_slug_key" ON "smart_links"("slug");
CREATE INDEX "smart_links_isArchived_createdAt_idx"
  ON "smart_links"("isArchived", "createdAt");

CREATE TABLE "smart_link_visits" (
    "id" TEXT NOT NULL,
    "smartLinkId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceHost" TEXT,
    CONSTRAINT "smart_link_visits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "smart_link_visits_smartLinkId_occurredAt_idx"
  ON "smart_link_visits"("smartLinkId", "occurredAt");
ALTER TABLE "smart_link_visits" ADD CONSTRAINT "smart_link_visits_smartLinkId_fkey"
  FOREIGN KEY ("smartLinkId") REFERENCES "smart_links"("id") ON DELETE RESTRICT ON UPDATE CASCADE;