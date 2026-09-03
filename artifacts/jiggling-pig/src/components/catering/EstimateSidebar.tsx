"use client";
import React from "react";
import type { EventDetails, EstimateResult, SelectedItem, CateringMenuItem, CateringPackage } from "./CateringCalculator";

interface Props {
  eventDetails: EventDetails;
  estimate: EstimateResult | null;
  estimateLoading: boolean;
  selectedItems: SelectedItem[];
  menuItems: CateringMenuItem[];
  packages: CateringPackage[];
  deliveryFee: number;
}

export default function EstimateSidebar({
  eventDetails,
  estimate,
  estimateLoading,
  selectedItems,
  menuItems,
  packages,
  deliveryFee,
}: Props) {
  const getItemName = (id: string) => menuItems.find((i) => i.id === id)?.name || "Unknown";

  return (
    <div
      style={{
        position: "sticky",
        top: "120px",
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: "12px",
        padding: "24px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      }}
    >
      <h4 style={{ marginBottom: "20px", fontSize: "20px" }}>
        <i className="fa-solid fa-receipt" style={{ marginRight: "8px", color: "#f47920" }}></i>
        Your Estimate
      </h4>

      <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #eee" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ color: "#888", fontSize: "14px" }}>Guests</span>
          <span style={{ fontWeight: "600" }}>{eventDetails.guestCount}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ color: "#888", fontSize: "14px" }}>Appetite</span>
          <span style={{ fontWeight: "600" }}>
            {eventDetails.appetiteLevel === "LIGHT"
              ? "🍃 Light"
              : eventDetails.appetiteLevel === "MODERATE"
              ? "🍽️ Moderate"
              : "🔥 Heavy"}
          </span>
        </div>
        {eventDetails.eventDate && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ color: "#888", fontSize: "14px" }}>Date</span>
            <span style={{ fontWeight: "600" }}>
              {new Date(eventDetails.eventDate + "T00:00:00").toLocaleDateString()}
            </span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#888", fontSize: "14px" }}>Service</span>
          <span style={{ fontWeight: "600" }}>
            {eventDetails.serviceStyle === "DROP_OFF" ? "Drop-Off" : "Drop-Off + Setup"}
          </span>
        </div>
      </div>

      {selectedItems.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#bbb" }}>
          <i className="fa-solid fa-plate-wheat" style={{ fontSize: "32px", marginBottom: "8px", display: "block" }}></i>
          <p style={{ fontSize: "14px", margin: 0 }}>Select menu items to see your estimate</p>
        </div>
      ) : estimateLoading ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
          <p style={{ fontSize: "14px", marginTop: "8px", color: "#888" }}>Calculating...</p>
        </div>
      ) : estimate ? (
        <>
          <div style={{ marginBottom: "16px" }}>
            <h6 style={{ fontSize: "14px", color: "#888", marginBottom: "8px", textTransform: "uppercase" }}>
              Items & Quantities
            </h6>
            {estimate.lineItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 0",
                  borderBottom: idx < estimate.lineItems.length - 1 ? "1px solid #f5f5f5" : "none",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "500" }}>{item.itemName}</div>
                  <div style={{ fontSize: "12px", color: "#888" }}>
                    {item.quantity} {item.unitOfMeasure} × ${Number(item.unitPrice).toFixed(2)}
                  </div>
                </div>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>${Number(item.lineTotal).toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div style={{ paddingTop: "12px", borderTop: "2px solid #eee" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "14px" }}>Food Subtotal</span>
              <span style={{ fontWeight: "600" }}>${Number(estimate.foodSubtotal).toFixed(2)}</span>
            </div>
            {(estimate.deliveryFee > 0 || deliveryFee > 0) && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "14px" }}>Delivery Fee</span>
                <span style={{ fontWeight: "600" }}>
                  ${Number(estimate.deliveryFee || deliveryFee).toFixed(2)}
                </span>
              </div>
            )}
            {estimate.setupFee > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "14px" }}>Setup Fee</span>
                <span style={{ fontWeight: "600" }}>${Number(estimate.setupFee).toFixed(2)}</span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "2px solid #f47920",
              }}
            >
              <span style={{ fontSize: "18px", fontWeight: "bold" }}>Total Estimate</span>
              <span style={{ fontSize: "18px", fontWeight: "bold", color: "#f47920" }}>
                ${Number(estimate.totalEstimate).toFixed(2)}
              </span>
            </div>
          </div>

          {estimate.suggestedPackages && estimate.suggestedPackages.length > 0 && (
            <div
              style={{
                marginTop: "16px",
                padding: "12px",
                background: "#e8f5e9",
                borderRadius: "8px",
                border: "1px solid #c8e6c9",
              }}
            >
              <h6 style={{ fontSize: "13px", color: "#2e7d32", marginBottom: "8px" }}>
                <i className="fa-solid fa-tag" style={{ marginRight: "6px" }}></i>
                Package Suggestion
              </h6>
              {estimate.suggestedPackages.map((sp) => (
                <div key={sp.id} style={{ fontSize: "13px" }}>
                  <strong>{sp.name}</strong> — ${Number(sp.price).toFixed(2)}
                  {sp.savings > 0 && (
                    <span style={{ color: "#2e7d32", fontWeight: "bold" }}>
                      {" "}(Save ${Number(sp.savings).toFixed(2)}!)
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "16px 0", color: "#bbb" }}>
          <p style={{ fontSize: "14px", margin: 0 }}>
            {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} selected
          </p>
          {selectedItems.slice(0, 5).map((si) => (
            <div key={si.menuItemId} style={{ fontSize: "13px", color: "#888" }}>
              {getItemName(si.menuItemId)}
            </div>
          ))}
          {selectedItems.length > 5 && (
            <div style={{ fontSize: "13px", color: "#888" }}>
              +{selectedItems.length - 5} more
            </div>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: "16px",
          padding: "12px",
          background: "#f5f5f5",
          borderRadius: "8px",
          fontSize: "12px",
          color: "#888",
          textAlign: "center",
        }}
      >
        This is an estimate. Final pricing will be confirmed in your quote.
      </div>
    </div>
  );
}
