import { ApiError } from '../../utils/apiError';

export type PickupScheduleConfig = {
  schedulingEnabled: boolean;
  eventDate: string;
  opensAt: string;
  shutsDownAt: string;
  timezone: string;
  slotIntervalMinutes: number;
  minimumPrepMinutes: number;
  reminderLeadMinutes: number;
};

export type PickupSlot = { value: string; label: string };
export const PICKUP_SHUTDOWN_CUTOFF_MINUTES = 30;

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value('year'), month: value('month'), day: value('day'),
    hour: value('hour'), minute: value('minute'), second: value('second'),
  };
}

/** Converts a local wall-clock time to an instant without relying on the server timezone. */
export function localDateTimeToUtc(date: string, time: string, timeZone: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !isValidTimeZone(timeZone)) {
    return null;
  }
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let instant = new Date(desired);
  for (let index = 0; index < 3; index += 1) {
    const actual = zonedParts(instant, timeZone);
    const represented = Date.UTC(
      actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second,
    );
    instant = new Date(instant.getTime() + desired - represented);
  }
  const roundTrip = zonedParts(instant, timeZone);
  return roundTrip.year === year && roundTrip.month === month && roundTrip.day === day
    && roundTrip.hour === hour && roundTrip.minute === minute
    ? instant : null;
}

export function formatPickupTime(value: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(value));
}

export function availablePickupSlots(
  config: PickupScheduleConfig,
  now = new Date(),
): PickupSlot[] {
  if (!config.schedulingEnabled || !isValidTimeZone(config.timezone)) return [];
  const opening = localDateTimeToUtc(config.eventDate, config.opensAt, config.timezone);
  const shutdown = localDateTimeToUtc(config.eventDate, config.shutsDownAt, config.timezone);
  if (!opening || !shutdown || shutdown <= opening) return [];
  const latest = shutdown.getTime() - PICKUP_SHUTDOWN_CUTOFF_MINUTES * 60_000;
  const earliest = now.getTime() + config.minimumPrepMinutes * 60_000;
  const interval = config.slotIntervalMinutes * 60_000;
  const slots: PickupSlot[] = [];
  for (let value = opening.getTime(); value <= latest; value += interval) {
    if (value < earliest) continue;
    const instant = new Date(value);
    slots.push({
      value: instant.toISOString(),
      label: formatPickupTime(instant, config.timezone),
    });
  }
  return slots;
}

export function assertValidPickupSelection(
  config: PickupScheduleConfig,
  pickupAt: string | undefined,
  now = new Date(),
): Date | null {
  if (!config.schedulingEnabled) return null;
  if (!pickupAt) throw ApiError.unprocessable('Choose an available pickup time before paying.');
  const selected = new Date(pickupAt);
  if (Number.isNaN(selected.getTime())) throw ApiError.unprocessable('The selected pickup time is invalid.');
  const valid = availablePickupSlots(config, now).some((slot) => slot.value === selected.toISOString());
  if (!valid) {
    throw ApiError.unprocessable('That pickup time is no longer available. Choose another time before paying.');
  }
  return selected;
}