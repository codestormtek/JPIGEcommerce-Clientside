"use client";
import React, { useState } from "react";
import type { EstimateResult } from "./CateringCalculator";

interface Props {
  onSubmit: (info: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    deliveryAddress: string;
    deliveryNotes: string;
    allergyNotes: string;
    setupRequested: boolean;
    disposableKit: boolean;
  }) => Promise<void>;
  onBack: () => void;
  estimate: EstimateResult | null;
}

export default function QuoteContactForm({ onSubmit, onBack, estimate }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [allergyNotes, setAllergyNotes] = useState("");
  const [setupRequested, setSetupRequested] = useState(false);
  const [disposableKit, setDisposableKit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim() && email.trim() && estimate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit({
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        deliveryAddress: address.trim(),
        deliveryNotes: deliveryNotes.trim(),
        allergyNotes: allergyNotes.trim(),
        setupRequested,
        disposableKit,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: "8px", fontSize: "24px" }}>Almost There! Your Contact Information</h3>
      <p style={{ color: "#666", marginBottom: "24px" }}>
        Fill in your details and we&apos;ll send you a detailed quote within 24 hours.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="row" style={{ marginBottom: "16px" }}>
          <div className="col-md-6" style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "6px" }}>
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              required
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
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "16px",
              }}
            />
          </div>
        </div>

        <div className="row" style={{ marginBottom: "16px" }}>
          <div className="col-md-6" style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "6px" }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
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
              Delivery Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City, State"
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "16px",
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "6px" }}>
            Delivery Notes
          </label>
          <textarea
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            placeholder="Gate code, parking instructions, setup location, etc."
            rows={2}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "16px",
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontWeight: "600", marginBottom: "6px" }}>
            Allergy / Dietary Notes
          </label>
          <textarea
            value={allergyNotes}
            onChange={(e) => setAllergyNotes(e.target.value)}
            placeholder="Any allergies or dietary restrictions we should know about?"
            rows={2}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "16px",
              resize: "vertical",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: "24px",
            marginBottom: "24px",
            padding: "16px",
            background: "#f9f9f9",
            borderRadius: "8px",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={setupRequested}
              onChange={(e) => setSetupRequested(e.target.checked)}
              style={{ width: "18px", height: "18px" }}
            />
            <span>
              <strong>Setup Service</strong>
              <br />
              <small style={{ color: "#888" }}>We&apos;ll set up the food display for you</small>
            </span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={disposableKit}
              onChange={(e) => setDisposableKit(e.target.checked)}
              style={{ width: "18px", height: "18px" }}
            />
            <span>
              <strong>Disposable Kit</strong>
              <br />
              <small style={{ color: "#888" }}>Plates, napkins, utensils, cups</small>
            </span>
          </label>
        </div>

        {!estimate && (
          <div
            style={{
              padding: "12px",
              background: "#fff3e0",
              borderRadius: "8px",
              border: "1px solid #ffe0b2",
              marginBottom: "16px",
              fontSize: "14px",
              color: "#e65100",
            }}
          >
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: "8px" }}></i>
            Please select at least one menu item to get an estimate before submitting.
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
          <button
            type="button"
            className="rts-btn btn-primary border-only"
            onClick={onBack}
            style={{ padding: "12px 32px" }}
          >
            <i className="fa-solid fa-arrow-left" style={{ marginRight: "8px" }}></i> Back
          </button>
          <button
            type="submit"
            className="rts-btn btn-primary"
            disabled={!canSubmit || submitting}
            style={{ padding: "12px 40px", opacity: canSubmit && !submitting ? 1 : 0.5 }}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm" style={{ marginRight: "8px" }}></span>
                Submitting...
              </>
            ) : (
              <>
                Submit Quote Request <i className="fa-solid fa-paper-plane" style={{ marginLeft: "8px" }}></i>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
