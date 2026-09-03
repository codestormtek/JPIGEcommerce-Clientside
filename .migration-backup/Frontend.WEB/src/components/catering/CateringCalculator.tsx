"use client";
import React, { useState, useCallback, useEffect } from "react";
import { apiGet, apiPost } from "@/lib/api";
import EventDetailsForm from "./EventDetailsForm";
import OrderingStyleSelector from "./OrderingStyleSelector";
import MenuSelector from "./MenuSelector";
import EstimateSidebar from "./EstimateSidebar";
import QuoteContactForm from "./QuoteContactForm";

export interface CateringMenuItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  pricingType: string;
  unitPrice: number;
  isPremium: boolean;
  isActive: boolean;
  minOrderQty: number | null;
  maxOrderQty: number | null;
  portionUnit: string | null;
  displayOrder: number;
  mediaAsset: { id: string; url: string; altText: string | null } | null;
}

export interface CateringPackageTier {
  id: string;
  tierLabel: string | null;
  minGuests: number;
  maxGuests: number;
  pricePerPerson: number;
  flatPrice: number | null;
  displayOrder: number;
}

export interface CateringPackageItem {
  id: string;
  menuItemId: string;
  isRequired: boolean;
  isDefault: boolean;
  displayOrder: number;
  menuItem?: CateringMenuItem;
}

export interface CateringPackage {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  includedMeatCount: number;
  includedSideCount: number;
  includedSauceCount: number;
  includesRolls: boolean;
  includesTea: boolean;
  isActive: boolean;
  displayOrder: number;
  tiers: CateringPackageTier[];
  items: CateringPackageItem[];
  mediaAsset: { id: string; url: string; altText: string | null } | null;
}

export interface SelectedItem {
  menuItemId: string;
  quantity?: number;
}

export interface EstimateResult {
  lineItems: {
    menuItemId: string;
    itemName: string;
    quantity: number;
    unitOfMeasure: string;
    unitPrice: number;
    lineTotal: number;
    isPackageItem: boolean;
    packageId: string | null;
    notes: string | null;
  }[];
  foodSubtotal: number;
  deliveryFee: number;
  setupFee: number;
  disposableFee: number;
  totalEstimate: number;
  guestCount: number;
  appetiteLevel: string;
  suggestedPackages: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    savings: number;
    tier: {
      label: string | null;
      minGuests: number;
      maxGuests: number;
      pricePerPerson: number;
    };
  }[];
}

export interface EventDetails {
  guestCount: number;
  eventType: string;
  appetiteLevel: "LIGHT" | "MODERATE" | "HEAVY";
  serviceStyle: "DROP_OFF" | "DROP_OFF_SETUP";
  eventDate: string;
  eventTime: string;
  deliveryZip: string;
}

export type OrderingStyle = "package" | "custom" | "quick";

export default function CateringCalculator() {
  const [step, setStep] = useState(1);
  const [menuItems, setMenuItems] = useState<CateringMenuItem[]>([]);
  const [packages, setPackages] = useState<CateringPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const [eventDetails, setEventDetails] = useState<EventDetails>({
    guestCount: 20,
    eventType: "",
    appetiteLevel: "MODERATE",
    serviceStyle: "DROP_OFF",
    eventDate: "",
    eventTime: "",
    deliveryZip: "",
  });

  const [orderingStyle, setOrderingStyle] = useState<OrderingStyle>("custom");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [deliveryZoneMessage, setDeliveryZoneMessage] = useState("");
  const [dateAvailable, setDateAvailable] = useState<boolean | null>(null);
  const [dateMessage, setDateMessage] = useState("");
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState("");

  useEffect(() => {
    Promise.all([
      apiGet<{ data: CateringMenuItem[] } | CateringMenuItem[]>("/catering/public/menu"),
      apiGet<{ data: CateringPackage[] } | CateringPackage[]>("/catering/public/packages"),
    ])
      .then(([menuRes, pkgRes]) => {
        const rawItems = Array.isArray(menuRes) ? menuRes : (menuRes as any).data || [];
        const items: CateringMenuItem[] = Array.isArray(rawItems)
          ? rawItems
          : Object.values(rawItems as Record<string, CateringMenuItem[]>).flat();
        const rawPkgs = Array.isArray(pkgRes) ? pkgRes : (pkgRes as any).data || [];
        const pkgs: CateringPackage[] = Array.isArray(rawPkgs) ? rawPkgs : [];
        setMenuItems(items);
        setPackages(pkgs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const checkDeliveryFee = useCallback(async (zip: string) => {
    if (!zip || zip.length < 5) {
      setDeliveryFee(0);
      setDeliveryZoneMessage("");
      return;
    }
    try {
      const raw = await apiGet<{ data: { fee: number; zoneName: string; message?: string } }>(
        `/catering/public/delivery-fee?zip=${encodeURIComponent(zip)}`
      );
      const res = (raw as any).data || raw;
      setDeliveryFee(res.fee ?? 0);
      setDeliveryZoneMessage(res.zoneName ? `Zone: ${res.zoneName} — $${res.fee?.toFixed(2)} delivery` : "");
    } catch {
      setDeliveryFee(0);
      setDeliveryZoneMessage("Delivery not available for this ZIP code");
    }
  }, []);

  const checkAvailability = useCallback(async (date: string) => {
    if (!date) {
      setDateAvailable(null);
      setDateMessage("");
      return;
    }
    try {
      const raw = await apiGet<{ data: { available: boolean; message?: string } }>(
        `/catering/public/availability?date=${encodeURIComponent(date)}`
      );
      const res = (raw as any).data || raw;
      setDateAvailable(res.available);
      setDateMessage(res.available ? "Date is available!" : (res.message || "Date is not available"));
    } catch {
      setDateAvailable(null);
      setDateMessage("");
    }
  }, []);

  const calculateEstimate = useCallback(async () => {
    if (selectedItems.length === 0 || eventDetails.guestCount < 1) return;
    setEstimateLoading(true);
    try {
      const raw = await apiPost<{ data: EstimateResult }>("/catering/public/estimate", {
        guestCount: eventDetails.guestCount,
        appetiteLevel: eventDetails.appetiteLevel,
        selectedItems,
        deliveryZip: eventDetails.deliveryZip || undefined,
        setupRequested: eventDetails.serviceStyle === "DROP_OFF_SETUP",
      });
      setEstimate((raw as any).data || raw);
    } catch {
      setEstimate(null);
    } finally {
      setEstimateLoading(false);
    }
  }, [selectedItems, eventDetails]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedItems.length > 0 && eventDetails.guestCount > 0) {
        calculateEstimate();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [selectedItems, eventDetails.guestCount, eventDetails.appetiteLevel, eventDetails.serviceStyle, eventDetails.deliveryZip]);

  const handleSubmitQuote = async (contactInfo: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    deliveryAddress: string;
    deliveryNotes: string;
    allergyNotes: string;
    setupRequested: boolean;
    disposableKit: boolean;
  }) => {
    if (!estimate) return;
    try {
      const res = await apiPost<{ quoteNumber: string }>("/catering/public/quote", {
        customerName: contactInfo.customerName,
        customerEmail: contactInfo.customerEmail,
        customerPhone: contactInfo.customerPhone || null,
        eventDate: eventDetails.eventDate,
        eventTime: eventDetails.eventTime || null,
        eventType: eventDetails.eventType || null,
        guestCount: eventDetails.guestCount,
        appetiteLevel: eventDetails.appetiteLevel,
        serviceStyle: eventDetails.serviceStyle,
        deliveryZip: eventDetails.deliveryZip || null,
        deliveryAddress: contactInfo.deliveryAddress || null,
        deliveryNotes: contactInfo.deliveryNotes || null,
        allergyNotes: contactInfo.allergyNotes || null,
        setupRequested: contactInfo.setupRequested,
        disposableKit: contactInfo.disposableKit,
        foodSubtotal: estimate.foodSubtotal,
        deliveryFee: estimate.deliveryFee,
        setupFee: estimate.setupFee,
        totalEstimate: estimate.totalEstimate,
        items: estimate.lineItems.map((i) => ({
          menuItemId: i.menuItemId || null,
          itemName: i.itemName,
          quantity: i.quantity,
          unitOfMeasure: i.unitOfMeasure,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
          isPackageItem: i.isPackageItem || false,
          packageId: i.packageId || null,
          notes: i.notes || null,
        })),
      });
      const quoteData = (res as any).data || res;
      setQuoteNumber(quoteData.quoteNumber);
      setQuoteSubmitted(true);
    } catch (err: any) {
      alert(err.message || "Failed to submit quote. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="rts-section-gap">
        <div className="container">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading catering menu...</p>
          </div>
        </div>
      </div>
    );
  }

  if (quoteSubmitted) {
    return (
      <div className="rts-section-gap">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="text-center py-5">
                <div style={{ fontSize: "64px", color: "#4CAF50", marginBottom: "20px" }}>
                  <i className="fa-solid fa-circle-check"></i>
                </div>
                <h2 style={{ marginBottom: "16px" }}>Quote Request Submitted!</h2>
                <p style={{ fontSize: "18px", color: "#666", marginBottom: "8px" }}>
                  Your quote number is:
                </p>
                <p style={{ fontSize: "28px", fontWeight: "bold", color: "#f47920", marginBottom: "24px" }}>
                  {quoteNumber}
                </p>
                <p style={{ color: "#666", marginBottom: "32px" }}>
                  We&apos;ll review your request and get back to you within 24 hours.
                  Check your email for a confirmation with your quote details.
                </p>
                <button
                  className="rts-btn btn-primary"
                  onClick={() => {
                    setQuoteSubmitted(false);
                    setQuoteNumber("");
                    setStep(1);
                    setSelectedItems([]);
                    setEstimate(null);
                    setEventDetails({
                      guestCount: 20,
                      eventType: "",
                      appetiteLevel: "MODERATE",
                      serviceStyle: "DROP_OFF",
                      eventDate: "",
                      eventTime: "",
                      deliveryZip: "",
                    });
                  }}
                >
                  Start New Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const groupedItems: Record<string, CateringMenuItem[]> = {};
  menuItems.forEach((item) => {
    if (!groupedItems[item.category]) groupedItems[item.category] = [];
    groupedItems[item.category].push(item);
  });

  return (
    <div className="rts-section-gap">
      <div className="container">
        <div className="row">
          <div className="col-lg-8">
            <div className="catering-steps">
              <div className="step-indicators" style={{ display: "flex", gap: "8px", marginBottom: "32px" }}>
                {[1, 2, 3, 4].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      if (s <= step || (s === 2 && step >= 1) || (s === 3 && step >= 2) || (s === 4 && step >= 3)) {
                        setStep(s);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: step === s ? "#f47920" : step > s ? "#4CAF50" : "#e0e0e0",
                      color: step >= s ? "#fff" : "#666",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: step === s ? "bold" : "normal",
                      transition: "all 0.3s",
                    }}
                  >
                    Step {s}:{" "}
                    {s === 1
                      ? "Event Details"
                      : s === 2
                      ? "Ordering Style"
                      : s === 3
                      ? "Select Menu"
                      : "Contact Info"}
                  </button>
                ))}
              </div>

              {step === 1 && (
                <EventDetailsForm
                  eventDetails={eventDetails}
                  onChange={(updates: Partial<EventDetails>) => setEventDetails((prev) => ({ ...prev, ...updates }))}
                  onCheckDeliveryFee={checkDeliveryFee}
                  onCheckAvailability={checkAvailability}
                  deliveryZoneMessage={deliveryZoneMessage}
                  dateAvailable={dateAvailable}
                  dateMessage={dateMessage}
                  onNext={() => setStep(2)}
                />
              )}

              {step === 2 && (
                <OrderingStyleSelector
                  orderingStyle={orderingStyle}
                  onChange={setOrderingStyle}
                  packages={packages}
                  guestCount={eventDetails.guestCount}
                  selectedPackageId={selectedPackageId}
                  onSelectPackage={(pkgId: string) => {
                    setSelectedPackageId(pkgId);
                    const pkg = packages.find((p) => p.id === pkgId);
                    if (pkg) {
                      const defaultItems = pkg.items
                        .filter((i) => i.isDefault || i.isRequired)
                        .map((i) => ({ menuItemId: i.menuItemId }));
                      setSelectedItems(defaultItems);
                    }
                  }}
                  onNext={() => setStep(3)}
                  onBack={() => setStep(1)}
                />
              )}

              {step === 3 && (
                <MenuSelector
                  groupedItems={groupedItems}
                  selectedItems={selectedItems}
                  onToggleItem={(menuItemId: string) => {
                    setSelectedItems((prev) => {
                      const exists = prev.find((i) => i.menuItemId === menuItemId);
                      if (exists) return prev.filter((i) => i.menuItemId !== menuItemId);
                      return [...prev, { menuItemId }];
                    });
                  }}
                  onUpdateQuantity={(menuItemId: string, quantity: number) => {
                    setSelectedItems((prev) =>
                      prev.map((i) =>
                        i.menuItemId === menuItemId ? { ...i, quantity } : i
                      )
                    );
                  }}
                  onNext={() => setStep(4)}
                  onBack={() => setStep(2)}
                />
              )}

              {step === 4 && (
                <QuoteContactForm
                  onSubmit={handleSubmitQuote}
                  onBack={() => setStep(3)}
                  estimate={estimate}
                />
              )}
            </div>
          </div>

          <div className="col-lg-4">
            <EstimateSidebar
              eventDetails={eventDetails}
              estimate={estimate}
              estimateLoading={estimateLoading}
              selectedItems={selectedItems}
              menuItems={menuItems}
              packages={packages}
              deliveryFee={deliveryFee}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
