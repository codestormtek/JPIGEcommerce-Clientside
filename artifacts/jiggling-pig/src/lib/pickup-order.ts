/**
 * SMS consent is an independent, optional checkout choice. Keep the public
 * config as the source of truth so a stale checkbox can never opt a customer
 * in after SMS has been disabled for pickup.
 */
export function getPickupSmsOptIn(
  smsEnabled: boolean | null | undefined,
  requestedOptIn: boolean,
): boolean {
  return smsEnabled === true && requestedOptIn === true;
}