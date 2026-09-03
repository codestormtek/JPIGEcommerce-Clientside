---
name: Scheduled-task SMS reminders & idempotency
description: How recurring SMS jobs avoid double-texting in the DB-driven scheduler
---

# Recurring SMS jobs in the DB-driven scheduler

## Registration
A new job is a no-arg async processor registered in `taskHandlerRegistry.ts`. On
startup `seedScheduledTasks()` auto-creates a `ScheduledTask` row from the
registry (UTC timezone, `allowConcurrentRuns=false`). No manual DB row needed.

## Idempotency without a schema change
For "send once per entity" jobs (e.g. catering event reminder), record each sent
message in `MessageOutbox` (channel/templateKey/payloadJson with the entity id)
and skip entities that already have a `status:'sent'` row. On send *failure*,
write NO outbox row so the next run retries.
**Why:** the prod (Render) DB does not auto-apply schema changes on deploy, and
the dev env points at the external DB via `EXTERNAL_DATABASE_URL` — so adding a
unique column/migration is operational risk. Reusing `MessageOutbox` avoids it.

## Concurrency = the real double-send risk
The check-then-send (`findFirst` outbox → `sendSms` → `create` outbox) is NOT
atomic. Two overlapping executions of the same task can both pass the check.
**How it's mitigated:** executions are serialized. The scheduled poll path
(`pollAndRunDueTasks`) skips a task when a `taskExecution` with `status:'running'`
exists and `allowConcurrentRuns=false`. `runTaskManually` originally bypassed
this guard — it now performs the same running-execution check and throws if one
is in progress. This is sufficient for the single-instance Render deployment;
a multi-instance deployment would still need a DB unique constraint.
