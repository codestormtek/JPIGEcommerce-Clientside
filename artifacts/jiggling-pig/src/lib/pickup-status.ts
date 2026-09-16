export const PICKUP_STATUS_STEPS = [
  "received",
  "preparing",
  "ready_for_pickup",
  "picked_up",
] as const;

export type PickupStatusStep = (typeof PICKUP_STATUS_STEPS)[number];
export type PickupStatusTerminal = "canceled" | "unknown" | "unavailable";
export type PickupStatusMode = "current" | "stale" | "unavailable";
export type PickupCapabilityErrorKind = "permanent" | "transient";

export interface PickupStatusPresentation {
  key: PickupStatusStep | PickupStatusTerminal;
  label: string;
  title: string;
  description: string;
  stepIndex: number;
  terminal: boolean;
}

const STATUS_PRESENTATIONS: Record<PickupStatusStep | PickupStatusTerminal, PickupStatusPresentation> = {
  received: {
    key: "received",
    label: "Received",
    title: "Order received",
    description: "Your order is in the queue. We’ll let you know when preparation begins.",
    stepIndex: 0,
    terminal: false,
  },
  preparing: {
    key: "preparing",
    label: "Preparing",
    title: "Your order is being prepared",
    description: "The pit crew is getting your order ready now.",
    stepIndex: 1,
    terminal: false,
  },
  ready_for_pickup: {
    key: "ready_for_pickup",
    label: "Ready for pickup",
    title: "Your order is ready",
    description: "Come by the pickup location when you’re ready to collect it.",
    stepIndex: 2,
    terminal: false,
  },
  picked_up: {
    key: "picked_up",
    label: "Picked up",
    title: "Order picked up",
    description: "Thanks for stopping by. Enjoy the good stuff.",
    stepIndex: 3,
    terminal: true,
  },
  canceled: {
    key: "canceled",
    label: "Canceled",
    title: "Order canceled",
    description: "This order is no longer available for pickup. Please contact us if you need help.",
    stepIndex: -1,
    terminal: true,
  },
  unknown: {
    key: "unknown",
    label: "Status updating",
    title: "We’re checking your order",
    description: "Your order is paid, but its pickup status is still updating. We’ll keep checking.",
    stepIndex: -1,
    terminal: false,
  },
  unavailable: {
    key: "unavailable",
    label: "Tracking unavailable",
    title: "Pickup tracking unavailable",
    description: "We can’t verify this order’s latest pickup status. It will not be shown as ready.",
    stepIndex: -1,
    terminal: true,
  },
};

/**
 * Convert the private order-status values returned by the pickup capability
 * endpoint into customer-facing pickup language. Payment state is intentionally
 * not part of this mapping.
 */
export function getPickupStatusPresentation(
  status: string | null | undefined,
): PickupStatusPresentation {
  switch (status?.trim().toLowerCase()) {
    case "pending":
    case "confirmed":
      return STATUS_PRESENTATIONS.received;
    case "processing":
      return STATUS_PRESENTATIONS.preparing;
    case "ready_to_ship":
      return STATUS_PRESENTATIONS.ready_for_pickup;
    case "delivered":
      return STATUS_PRESENTATIONS.picked_up;
    case "canceled":
    case "cancelled":
      return STATUS_PRESENTATIONS.canceled;
    default:
      return STATUS_PRESENTATIONS.unknown;
  }
}

export function getSafePickupStatusPresentation(
  status: string | null | undefined,
  mode: PickupStatusMode = "current",
): PickupStatusPresentation {
  if (mode === "unavailable") return STATUS_PRESENTATIONS.unavailable;
  const current = getPickupStatusPresentation(status);
  if (mode !== "stale" || current.key === "unknown" || current.key === "canceled") {
    return current;
  }
  return {
    ...current,
    title: "Last known pickup status",
    label: `Last known: ${current.label}`,
    description: `Last known status: ${current.label}. We couldn’t refresh the order, so please don’t rely on this as its current status.`,
    terminal: false,
  };
}

/**
 * A capability can be permanently unusable when the server rejects it as
 * unauthorized, forbidden, or missing. Other failures should retain the last
 * known state and remain retryable.
 */
export function classifyPickupCapabilityError(
  statusCode: number | null | undefined,
): PickupCapabilityErrorKind {
  return statusCode === 401 || statusCode === 403 || statusCode === 404
    ? "permanent"
    : "transient";
}

export function isPickupStatusTerminal(status: string | null | undefined): boolean {
  if (status?.trim().toLowerCase() === "unavailable") return true;
  return getPickupStatusPresentation(status).terminal;
}