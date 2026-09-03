---
name: Square Terminal itemized orders
description: Rules for itemized Terminal receipts and safe kiosk payment retries
---
Square Terminal receives only a total unless the checkout is linked to a separately created Square Order. Receipt itemization and pickup identity belong on that Square Order, not in payment notes.

**Why:** Total-only Terminal checkouts produced receipts without products or customer pickup details. Adding Square Orders also exposed a double-charge risk when a network response is lost.

**How to apply:** Build the Square Order from authoritative local snapshots, verify its total before checkout, link it by order ID, use durable client request idempotency, and recover ambiguous Terminal checkouts before allowing a retry or restocking.