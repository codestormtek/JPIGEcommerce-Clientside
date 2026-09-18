-- Scheduling is opt-in in pickup_event_config, so legacy events remain ASAP.
-- This nullable snapshot is additive and does not backfill historical orders.
ALTER TABLE "shop_orders"
  ADD COLUMN "requestedFulfillmentTimezone" TEXT,
  ADD COLUMN "preparationReminderLeadMinutes" INTEGER;