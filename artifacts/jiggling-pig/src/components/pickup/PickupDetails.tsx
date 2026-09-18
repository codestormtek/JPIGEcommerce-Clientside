"use client";

export interface PickupDetailsProps {
  eventName?: string | null;
  streetAddress?: string | null;
  asapWaitMinutes?: number | null;
  pickupInstructions?: string | null;
  scheduled?: boolean;
  selectedPickupLabel?: string | null;
}

export function getPickupMapsUrl(streetAddress?: string | null): string | null {
  const address = streetAddress?.trim();
  return address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;
}

export default function PickupDetails({
  eventName,
  streetAddress,
  asapWaitMinutes,
  pickupInstructions,
  scheduled = false,
  selectedPickupLabel,
}: PickupDetailsProps) {
  const name = eventName?.trim();
  const address = streetAddress?.trim();
  const instructions = pickupInstructions?.trim();
  const mapsUrl = getPickupMapsUrl(address);
  const hasWait = !scheduled && typeof asapWaitMinutes === "number" && asapWaitMinutes > 0;

  if (!name && !address && !hasWait && !instructions) return null;

  return (
    <section className="jp-pickup-details" aria-labelledby="pickup-details-title">
      <div className="jp-pickup-details-heading">
        <p className="jp-kicker" id="pickup-details-title">Pickup details</p>
        <span>{scheduled ? "Scheduled pickup" : "ASAP pickup"}</span>
      </div>
      <dl>
        {name && (
          <div>
            <dt>Location</dt>
            <dd>{name}</dd>
          </div>
        )}
        {hasWait && (
          <div>
            <dt>Estimated wait</dt>
            <dd>About {asapWaitMinutes} minutes</dd>
          </div>
        )}
        {scheduled && selectedPickupLabel && (
          <div>
            <dt>Pickup time</dt>
            <dd>{selectedPickupLabel}</dd>
          </div>
        )}
        {address && (
          <div className="jp-pickup-details-address">
            <dt>Address</dt>
            <dd>
              <span>{address}</span>
              {mapsUrl && (
                <a
                  className="jp-link"
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in Maps
                </a>
              )}
            </dd>
          </div>
        )}
      </dl>
      {instructions && (
        <p className="jp-pickup-instructions">
          <strong>Pickup instructions</strong>
          <span>{instructions}</span>
        </p>
      )}
      {hasWait && (
        <p className="jp-pickup-details-note">
          Preparation times are estimates and may vary during busy periods.
        </p>
      )}
    </section>
  );
}