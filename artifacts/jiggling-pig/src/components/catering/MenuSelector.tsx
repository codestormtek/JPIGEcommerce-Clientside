"use client";
import React, { useState } from "react";
import type { CateringMenuItem, SelectedItem } from "./CateringCalculator";

interface Props {
  groupedItems: Record<string, CateringMenuItem[]>;
  selectedItems: SelectedItem[];
  onToggleItem: (menuItemId: string) => void;
  onUpdateQuantity: (menuItemId: string, quantity: number) => void;
  onNext: () => void;
  onBack: () => void;
}

const CATEGORY_ORDER = ["MEAT", "SIDE", "BREAD", "SAUCE", "DRINK", "DESSERT"];
const CATEGORY_LABELS: Record<string, string> = {
  MEAT: "Smoked Meats",
  SIDE: "Sides",
  BREAD: "Breads",
  SAUCE: "Sauces",
  DRINK: "Drinks",
  DESSERT: "Desserts",
};
const CATEGORY_ICONS: Record<string, string> = {
  MEAT: "🥩",
  SIDE: "🥗",
  BREAD: "🍞",
  SAUCE: "🫙",
  DRINK: "🥤",
  DESSERT: "🍰",
};

export default function MenuSelector({
  groupedItems,
  selectedItems,
  onToggleItem,
  onUpdateQuantity,
  onNext,
  onBack,
}: Props) {
  const [activeCategory, setActiveCategory] = useState(
    CATEGORY_ORDER.find((c) => groupedItems[c]?.length) || "MEAT"
  );

  const isSelected = (id: string) => selectedItems.some((i) => i.menuItemId === id);
  const getQuantity = (id: string) => selectedItems.find((i) => i.menuItemId === id)?.quantity;
  const selectedCount = selectedItems.length;

  const categories = CATEGORY_ORDER.filter((c) => groupedItems[c]?.length);

  return (
    <div>
      <h3 style={{ marginBottom: "8px", fontSize: "24px" }}>Select Your Menu Items</h3>
      <p style={{ color: "#666", marginBottom: "24px" }}>
        Choose your meats, sides, and extras. We&apos;ll calculate the perfect portions for your guest count.
      </p>

      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
        {categories.map((cat) => {
          const count = groupedItems[cat]?.filter((i) => isSelected(i.id)).length || 0;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: "8px 16px",
                border: activeCategory === cat ? "2px solid #f47920" : "1px solid #ddd",
                borderRadius: "20px",
                background: activeCategory === cat ? "#fff5ed" : "#fff",
                color: activeCategory === cat ? "#f47920" : "#333",
                fontWeight: activeCategory === cat ? "bold" : "normal",
                cursor: "pointer",
                transition: "all 0.2s",
                fontSize: "14px",
              }}
            >
              {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat] || cat}
              {count > 0 && (
                <span
                  style={{
                    marginLeft: "6px",
                    background: "#f47920",
                    color: "#fff",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="row">
        {(groupedItems[activeCategory] || [])
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((item) => {
            const selected = isSelected(item.id);
            const qty = getQuantity(item.id);
            return (
              <div className="col-md-6" key={item.id} style={{ marginBottom: "16px" }}>
                <div
                  style={{
                    padding: "16px",
                    border: selected ? "2px solid #f47920" : "1px solid #ddd",
                    borderRadius: "12px",
                    background: selected ? "#fff5ed" : "#fff",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <h5 style={{ margin: 0, fontSize: "16px" }}>{item.name}</h5>
                        {item.isPremium && (
                          <span
                            style={{
                              background: "#ffd700",
                              color: "#333",
                              fontSize: "10px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontWeight: "bold",
                            }}
                          >
                            PREMIUM
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p style={{ fontSize: "13px", color: "#888", margin: "4px 0" }}>{item.description}</p>
                      )}
                      <div style={{ fontSize: "14px", color: "#f47920", fontWeight: "600" }}>
                        ${Number(item.unitPrice).toFixed(2)}{" "}
                        <span style={{ fontSize: "12px", color: "#888", fontWeight: "normal" }}>
                          / {item.pricingType.replace("PER_", "").toLowerCase().replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onToggleItem(item.id)}
                      style={{
                        width: "40px",
                        height: "40px",
                        border: selected ? "2px solid #f47920" : "1px solid #ddd",
                        borderRadius: "8px",
                        background: selected ? "#f47920" : "#fff",
                        color: selected ? "#fff" : "#ccc",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                        flexShrink: 0,
                        marginLeft: "12px",
                      }}
                    >
                      {selected ? "✓" : "+"}
                    </button>
                  </div>

                  {selected && (
                    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #eee" }}>
                      <label style={{ fontSize: "13px", color: "#666", marginBottom: "4px", display: "block" }}>
                        Custom quantity (optional — leave blank for auto-sizing):
                      </label>
                      <input
                        type="number"
                        min={item.minOrderQty || 1}
                        max={item.maxOrderQty || 999}
                        value={qty || ""}
                        placeholder="Auto"
                        onChange={(e) => {
                          const val = e.target.value ? parseFloat(e.target.value) : undefined;
                          onUpdateQuantity(item.id, val as any);
                        }}
                        style={{
                          width: "120px",
                          padding: "6px 10px",
                          border: "1px solid #ddd",
                          borderRadius: "6px",
                          fontSize: "14px",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px" }}>
        <button
          className="rts-btn btn-primary border-only"
          onClick={onBack}
          style={{ padding: "12px 32px" }}
        >
          <i className="fa-solid fa-arrow-left" style={{ marginRight: "8px" }}></i> Back
        </button>
        <span style={{ color: "#666" }}>{selectedCount} item{selectedCount !== 1 ? "s" : ""} selected</span>
        <button
          className="rts-btn btn-primary"
          disabled={selectedCount === 0}
          onClick={onNext}
          style={{ padding: "12px 32px", opacity: selectedCount === 0 ? 0.5 : 1 }}
        >
          Next: Contact Info <i className="fa-solid fa-arrow-right" style={{ marginLeft: "8px" }}></i>
        </button>
      </div>
    </div>
  );
}
