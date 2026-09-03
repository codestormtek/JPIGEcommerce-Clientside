import { CronExpressionParser } from 'cron-parser';

export function computeNextRunAt(
  scheduleType: string,
  cronExpression?: string | null,
  runOnceAt?: string | null,
  intervalSeconds?: number | null,
  timezone?: string | null,
): Date | null {
  const now = new Date();

  if (scheduleType === 'cron' && cronExpression) {
    try {
      const opts: { currentDate: Date; tz?: string } = { currentDate: now };
      if (timezone) opts.tz = timezone;
      const interval = CronExpressionParser.parse(cronExpression, opts);
      return interval.next().toDate();
    } catch {
      return null;
    }
  }

  if (scheduleType === 'once' && runOnceAt) {
    const d = new Date(runOnceAt);
    return d > now ? d : null;
  }

  if (scheduleType === 'interval' && intervalSeconds) {
    return new Date(now.getTime() + intervalSeconds * 1000);
  }

  return null;
}
