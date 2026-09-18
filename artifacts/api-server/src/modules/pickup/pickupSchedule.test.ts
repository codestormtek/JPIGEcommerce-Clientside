import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertValidPickupSelection,
  availablePickupSlots,
  localDateTimeToUtc,
} from './pickupSchedule';

const schedule = {
  schedulingEnabled: true,
  eventDate: '2027-06-12',
  opensAt: '10:00',
  shutsDownAt: '12:00',
  timezone: 'America/New_York',
  slotIntervalMinutes: 15,
  minimumPrepMinutes: 15,
  reminderLeadMinutes: 15,
};

test('slots use event timezone and stop thirty minutes before shutdown', () => {
  const slots = availablePickupSlots(schedule, new Date('2027-06-12T12:00:00.000Z'));
  assert.equal(slots[0]?.value, '2027-06-12T14:00:00.000Z');
  assert.equal(slots.at(-1)?.value, '2027-06-12T15:30:00.000Z');
  assert.equal(slots.length, 7);
});

test('minimum preparation time removes stale slots', () => {
  const slots = availablePickupSlots(schedule, new Date('2027-06-12T14:01:00.000Z'));
  assert.equal(slots[0]?.value, '2027-06-12T14:30:00.000Z');
});

test('checkout accepts only an exact currently offered slot', () => {
  const now = new Date('2027-06-12T12:00:00.000Z');
  assert.equal(
    assertValidPickupSelection(schedule, '2027-06-12T14:15:00.000Z', now)?.toISOString(),
    '2027-06-12T14:15:00.000Z',
  );
  assert.throws(
    () => assertValidPickupSelection(schedule, '2027-06-12T15:45:00.000Z', now),
    /no longer available/,
  );
});

test('nonexistent daylight-saving wall times are rejected', () => {
  assert.equal(localDateTimeToUtc('2027-03-14', '02:30', 'America/New_York'), null);
});