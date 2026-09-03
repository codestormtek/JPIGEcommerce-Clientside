"use client";
import React from "react";
import type { EventDetails } from "./CateringCalculator";

interface Props {
  eventDetails: EventDetails;
  onChange: (updates: Partial<EventDetails>) => void;
  onCheckDeliveryFee: (zip: string) => void;
  onCheckAvailability: (date: string) => void;
  deliveryZoneMessage: string;
  dateAvailable: boolean | null;
  dateMessage: string;
  onNext: () => void;
}

const EVENT_TYPES = [
  "Birthday Party",
  "Wedding Reception",
  "Corporate Event",
  "Family Reunion",
  "Graduation Party",
  "Church Event",
  "Fundraiser",
  "Holiday Party",
  "Tailgate",
  "Other",
];

export default function EventDetailsForm({
  eventDetails,
  onChange,
  onCheckDeliveryFee,
  onCheckAvailability,
  deliveryZoneMessage,
  dateAvailable,
  dateMessage,
  onNext,
}: Props) {
  const canProceed = eventDetails.guestCount >= 1 && eventDetails.eventDate;

  return (
    <div className="event-details-form">
      <h3 style={{ marginBottom: "24px", fontSize: "24px" }}>Tell Us About Your Event</h3>

      <div className="row" style={{ marginBottom: "20px" }}>
        <div className="col-md-6" style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "6px" }}>
            Number of Guests *
          </label>
          <input
            type="number"
            min={1}
            max={500}
            value={eventDetails.guestCount}
            onChange={(e) => onChange({ guestCount: parseInt(e.target.value) || 1 })}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "16px",
            }}
          />
        </div>

        <div className="col-md-6" style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "6px" }}>
            Event Type
          </label>
          <select
            value={eventDetails.eventType}
            onChange={(e) => onChange({ eventType: e.target.value })}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "16px",
              background: "#fff",
            }}
          >
            <option value="">Select event type...</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="row" style={{ marginBottom: "20px" }}>
        <div className="col-md-6" style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "6px" }}>
            Appetite Level
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            {(["LIGHT", "MODERATE", "HEAVY"] as const).map((level) => (
              <button
                key={level}
                onClick={() => onChange({ appetiteLevel: level })}
                style={{
                  flex: 1,
                  padding: "10px",
                  border: eventDetails.appetiteLevel === level ? "2px solid #f47920" : "1px solid #ddd",
                  borderRadius: "8px",
                  background: eventDetails.appetiteLevel === level ? "#fff5ed" : "#fff",
                  color: eventDetails.appetiteLevel === level ? "#f47920" : "#333",
                  fontWeight: eventDetails.appetiteLevel === level ? "bold" : "normal",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {level === "LIGHT" ? "🍃 Light" : level === "MODERATE" ? "🍽️ Moderate" : "🔥 Heavy"}
              </button>
            ))}
          </div>
        </div>

        <div className="col-md-6" style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "6px" }}>
            Service Style
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            {(["DROP_OFF", "DROP_OFF_SETUP"] as const).map((style) => (
              <button
                key={style}
                onClick={() => onChange({ serviceStyle: style })}
                style={{
                  flex: 1,
                  padding: "10px",
                  border: eventDetails.serviceStyle === style ? "2px solid #f47920" : "1px solid #ddd",
                  borderRadius: "8px",
                  background: eventDetails.serviceStyle === style ? "#fff5ed" : "#fff",
                  color: eventDetails.serviceStyle === style ? "#f47920" : "#333",
                  fontWeight: eventDetails.serviceStyle === style ? "bold" : "normal",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {style === "DROP_OFF" ? "Drop-Off" : "Drop-Off + Setup"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="row" style={{ marginBottom: "20px" }}>
        <div className="col-md-4" style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "6px" }}>
            Event Date *
          </label>
          <input
            type="date"
            value={eventDetails.eventDate}
            min={new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0]}
            onChange={(e) => {
              onChange({ eventDate: e.target.value });
              onCheckAvailability(e.target.value);
            }}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "16px",
            }}
          />
          {dateMessage && (
            <small style={{ color: dateAvailable ? "#4CAF50" : "#f44336", marginTop: "4px", display: "block" }}>
              {dateMessage}
            </small>
          )}
        </div>

        <div className="col-md-4" style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "6px" }}>
            Event Time
          </label>
          <input
            type="time"
            value={eventDetails.eventTime}
            onChange={(e) => onChange({ eventTime: e.target.value })}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "16px",
            }}
          />
        </div>

        <div className="col-md-4" style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "6px" }}>
            Delivery ZIP Code
          </label>
          <input
            type="text"
            maxLength={10}
            value={eventDetails.deliveryZip}
            onChange={(e) => {
              onChange({ deliveryZip: e.target.value });
              onCheckDeliveryFee(e.target.value);
            }}
            placeholder="Enter ZIP..."
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "16px",
            }}
          />
          {deliveryZoneMessage && (
            <small style={{ color: "#666", marginTop: "4px", display: "block" }}>
              {deliveryZoneMessage}
            </small>
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
        <button
          className="rts-btn btn-primary"
          disabled={!canProceed}
          onClick={onNext}
          style={{ opacity: canProceed ? 1 : 0.5, padding: "12px 32px" }}
        >
          Next: Choose Ordering Style <i className="fa-solid fa-arrow-right" style={{ marginLeft: "8px" }}></i>
        </button>
      </div>
    </div>
  );
}
