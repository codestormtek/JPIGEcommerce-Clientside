-- Globally controlled kiosk upsell and post-sale advertising campaigns.
CREATE TABLE "kiosk_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "title" TEXT,
    "body" TEXT,
    "campaignType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "amountOff" DECIMAL(10,2),
    "mediaAssetId" TEXT,
    "durationSeconds" INTEGER NOT NULL DEFAULT 10,
    "allKiosks" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "kiosk_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "kiosk_campaign_products" (
    "campaignId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    CONSTRAINT "kiosk_campaign_products_pkey" PRIMARY KEY ("campaignId", "productId")
);

CREATE INDEX "kiosk_campaigns_isActive_startsAt_endsAt_idx"
  ON "kiosk_campaigns"("isActive", "startsAt", "endsAt");
CREATE INDEX "kiosk_campaigns_priority_createdAt_idx"
  ON "kiosk_campaigns"("priority", "createdAt");

ALTER TABLE "kiosk_campaigns" ADD CONSTRAINT "kiosk_campaigns_mediaAssetId_fkey"
  FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "kiosk_campaign_products" ADD CONSTRAINT "kiosk_campaign_products_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "kiosk_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kiosk_campaign_products" ADD CONSTRAINT "kiosk_campaign_products_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;