"use client";

import {
  getSafePickupStatusPresentation,
  PICKUP_STATUS_STEPS,
  type PickupStatusMode,
  type PickupStatusStep,
} from "@/lib/pickup-status";

interface PickupStatusProps {
  status: string | null | undefined;
  mode?: PickupStatusMode;
  error?: string;
  refreshing?: boolean;
  onRetry?: () => void;
}

const STEP_LABELS: Record<PickupStatusStep, string> = {
  received: "Received",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  picked_up: "Picked up",
};

export default function PickupStatus({
  status,
  mode = "current",
  error,
  refreshing = false,
  onRetry,
}: PickupStatusProps) {
  const presentation = getSafePickupStatusPresentation(status, mode);
  const isUnknown = presentation.key === "unknown" || presentation.key === "unavailable";
  const isCanceled = presentation.key === "canceled";
  const isUnavailable = presentation.key === "unavailable";

  return (
    <section
      className={`jp-status-card${isCanceled ? " jp-status-card-canceled" : ""}${isUnavailable ? " jp-status-card-unavailable" : ""}`}
      aria-labelledby="pickup-status-title"
      data-testid="pickup-status-card"
    >
      <div className="jp-status-heading">
        <div>
          <p className="jp-kicker">Pickup status</p>
          <h2 id="pickup-status-title" data-testid="status-pickup-label">
            {presentation.title}
          </h2>
        </div>
        <span
          className="jp-status-badge"
          data-testid="status-pickup-badge"
          data-status={presentation.key}
        >
          {presentation.label}
        </span>
      </div>

      {!isCanceled && !isUnavailable && (
        <ol className="jp-status-steps" aria-label="Order progress">
          {PICKUP_STATUS_STEPS.map((step, index) => {
            const complete = !isUnknown && presentation.stepIndex > index;
            const active = !isUnknown && presentation.stepIndex === index;
            return (
              <li
                key={step}
                className={complete ? "complete" : active ? "active" : ""}
                data-testid={`status-step-${step}`}
                aria-current={active ? "step" : undefined}
              >
                <span aria-hidden="true">{complete ? "✓" : index + 1}</span>
                <strong>{STEP_LABELS[step]}</strong>
              </li>
            );
          })}
        </ol>
      )}

      <p className="jp-status-description" data-testid="text-pickup-status">
        {presentation.description}
      </p>
      {error && (
        <div className="jp-status-error" role="alert" data-testid="status-pickup-error">
          <span>{error}</span>
          {onRetry && (
            <button
              type="button"
              className="jp-ghost"
              onClick={onRetry}
              disabled={refreshing}
              data-testid="button-retry-pickup-status"
            >
              {refreshing ? "Checking…" : "Try again"}
            </button>
          )}
        </div>
      )}
      {!error && refreshing && (
        <p className="jp-status-refreshing" role="status" data-testid="status-pickup-refreshing">
          Checking for an update…
        </p>
      )}
    </section>
  );
}