"use client";
import React, { useState } from "react";
import { apiPost } from "@/lib/api";

export default function SmsSignupForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [zip, setZip] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = phone.trim().length >= 10 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      await apiPost("/live-sessions/public/subscribe", {
        name: name.trim() || undefined,
        phone: phone.trim(),
        zip: zip.trim() || undefined,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to subscribe. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div
        style={{
          padding: "24px",
          background: "#e8f5e9",
          borderRadius: "12px",
          textAlign: "center",
        }}
      >
        <i
          className="fa-solid fa-circle-check"
          style={{ fontSize: "36px", color: "#4CAF50", marginBottom: "12px", display: "block" }}
        ></i>
        <h4 style={{ marginBottom: "8px" }}>You&apos;re Signed Up!</h4>
        <p style={{ color: "#555", margin: 0 }}>
          We&apos;ll text you next time we fire up the smoker roadside.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "24px",
        background: "#fff8f0",
        borderRadius: "12px",
        border: "1px solid #ffe0b2",
      }}
    >
      <h4 style={{ marginBottom: "4px", fontSize: "20px" }}>
        <i className="fa-solid fa-bell" style={{ marginRight: "8px", color: "#ff8c00" }}></i>
        Get Text Alerts
      </h4>
      <p style={{ color: "#666", marginBottom: "16px", fontSize: "14px" }}>
        Be the first to know when we&apos;re serving roadside BBQ near you.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name (optional)"
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "16px",
            }}
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone Number *"
            required
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "16px",
            }}
          />
          <input
            type="text"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="ZIP Code (optional)"
            maxLength={10}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "16px",
            }}
          />
          {error && (
            <p style={{ color: "#d32f2f", fontSize: "14px", margin: 0 }}>{error}</p>
          )}
          <button
            type="submit"
            className="rts-btn btn-primary"
            disabled={!canSubmit}
            style={{
              padding: "12px",
              fontSize: "16px",
              fontWeight: "600",
              opacity: canSubmit ? 1 : 0.5,
              width: "100%",
            }}
          >
            {submitting ? (
              <>
                <span
                  className="spinner-border spinner-border-sm"
                  style={{ marginRight: "8px" }}
                ></span>
                Signing Up...
              </>
            ) : (
              "Sign Me Up"
            )}
          </button>
          <p style={{ fontSize: "12px", color: "#999", margin: 0, textAlign: "center" }}>
            Msg &amp; data rates may apply. Text STOP to unsubscribe anytime.
          </p>
        </div>
      </form>
    </div>
  );
}
