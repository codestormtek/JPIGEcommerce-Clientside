"use client";
import React from "react";
import type { CateringPackage, OrderingStyle } from "./CateringCalculator";

interface Props {
  orderingStyle: OrderingStyle;
  onChange: (style: OrderingStyle) => void;
  packages: CateringPackage[];
  guestCount: number;
  selectedPackageId: string | null;
  onSelectPackage: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function OrderingStyleSelector({
  orderingStyle,
  onChange,
  packages,
  guestCount,
  selectedPackageId,
  onSelectPackage,
  onNext,
  onBack,
}: Props) {
  const styles: { key: OrderingStyle; title: string; desc: string; icon: string }[] = [
    {
      key: "package",
      title: "Choose a Package",
      desc: "Pre-built packages with great value. Select a package and customize your choices.",
      icon: "fa-solid fa-box-open",
    },
    {
      key: "custom",
      title: "Build Your Own",
      desc: "Pick exactly what you want from our full menu. Perfect for custom events.",
      icon: "fa-solid fa-utensils",
    },
    {
      key: "quick",
      title: "Quick Estimate",
      desc: "Just pick your meats and sides — we'll calculate portions and pricing automatically.",
      icon: "fa-solid fa-calculator",
    },
  ];

  const getPackagePrice = (pkg: CateringPackage) => {
    const tier = pkg.tiers.find(
      (t) => guestCount >= t.minGuests && guestCount <= t.maxGuests
    );
    if (tier) {
      return tier.flatPrice || tier.pricePerPerson * guestCount;
    }
    if (pkg.tiers.length > 0) {
      const sorted = [...pkg.tiers].sort((a, b) => a.minGuests - b.minGuests);
      const nearest = guestCount < sorted[0].minGuests ? sorted[0] : sorted[sorted.length - 1];
      return nearest.flatPrice || nearest.pricePerPerson * guestCount;
    }
    return null;
  };

  return (
    <div>
      <h3 style={{ marginBottom: "24px", fontSize: "24px" }}>How Would You Like to Order?</h3>

      <div className="row" style={{ marginBottom: "24px" }}>
        {styles.map((s) => (
          <div className="col-md-4" key={s.key} style={{ marginBottom: "16px" }}>
            <div
              onClick={() => onChange(s.key)}
              style={{
                padding: "24px 16px",
                border: orderingStyle === s.key ? "2px solid #f47920" : "1px solid #ddd",
                borderRadius: "12px",
                background: orderingStyle === s.key ? "#fff5ed" : "#fff",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s",
                height: "100%",
              }}
            >
              <i
                className={s.icon}
                style={{
                  fontSize: "32px",
                  color: orderingStyle === s.key ? "#f47920" : "#999",
                  marginBottom: "12px",
                  display: "block",
                }}
              ></i>
              <h5 style={{ marginBottom: "8px" }}>{s.title}</h5>
              <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {orderingStyle === "package" && packages.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <h4 style={{ marginBottom: "16px" }}>Select a Package</h4>
          <div className="row">
            {packages.map((pkg) => {
              const price = getPackagePrice(pkg);
              return (
                <div className="col-md-6" key={pkg.id} style={{ marginBottom: "16px" }}>
                  <div
                    onClick={() => onSelectPackage(pkg.id)}
                    style={{
                      padding: "20px",
                      border: selectedPackageId === pkg.id ? "2px solid #f47920" : "1px solid #ddd",
                      borderRadius: "12px",
                      background: selectedPackageId === pkg.id ? "#fff5ed" : "#fff",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <h5 style={{ marginBottom: "8px", color: selectedPackageId === pkg.id ? "#f47920" : "#333" }}>
                      {pkg.name}
                    </h5>
                    {pkg.description && (
                      <p style={{ fontSize: "14px", color: "#666", marginBottom: "12px" }}>{pkg.description}</p>
                    )}
                    <div style={{ fontSize: "13px", color: "#888", marginBottom: "8px" }}>
                      {pkg.includedMeatCount} meat{pkg.includedMeatCount !== 1 ? "s" : ""} •{" "}
                      {pkg.includedSideCount} side{pkg.includedSideCount !== 1 ? "s" : ""} •{" "}
                      {pkg.includedSauceCount} sauce{pkg.includedSauceCount !== 1 ? "s" : ""}
                      {pkg.includesRolls && " • Rolls"}
                      {pkg.includesTea && " • Tea"}
                    </div>
                    {price !== null && (
                      <div style={{ fontSize: "20px", fontWeight: "bold", color: "#f47920" }}>
                        ${price.toFixed(2)}
                        <span style={{ fontSize: "14px", fontWeight: "normal", color: "#888" }}>
                          {" "}for {guestCount} guests
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
        <button
          className="rts-btn btn-primary border-only"
          onClick={onBack}
          style={{ padding: "12px 32px" }}
        >
          <i className="fa-solid fa-arrow-left" style={{ marginRight: "8px" }}></i> Back
        </button>
        <button
          className="rts-btn btn-primary"
          onClick={onNext}
          style={{ padding: "12px 32px" }}
        >
          Next: Select Menu Items <i className="fa-solid fa-arrow-right" style={{ marginLeft: "8px" }}></i>
        </button>
      </div>
    </div>
  );
}
