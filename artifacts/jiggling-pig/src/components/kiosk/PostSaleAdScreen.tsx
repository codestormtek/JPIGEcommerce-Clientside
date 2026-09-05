"use client";

import { useEffect, useState } from "react";
import type { KioskCampaign } from "@/lib/kiosk";

interface Props {
  campaigns: KioskCampaign[];
  onDone: () => void;
}

export default function PostSaleAdScreen({ campaigns, onDone }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (campaigns.length === 0 || currentIndex >= campaigns.length) {
      onDone();
      return;
    }

    const campaign = campaigns[currentIndex];
    const durationMs = (campaign.durationSeconds || 10) * 1000;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [currentIndex, campaigns, onDone]);

  if (campaigns.length === 0 || currentIndex >= campaigns.length) {
    return null;
  }

  const campaign = campaigns[currentIndex];

  return (
    <div 
      className="k-screen k-attract"
      style={{
        backgroundColor: "var(--k-bg)",
        backgroundImage: campaign.imageUrl ? `url(${campaign.imageUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      onClick={() => setCurrentIndex((prev) => prev + 1)}
    >
      {/* Overlay to ensure text readability if there's no image or it's too bright */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      
      <div className="k-attract-content" style={{ zIndex: 10 }}>
        {campaign.title && (
          <h1 style={{ color: "#fff", textShadow: "0 4px 12px rgba(0,0,0,0.8)" }}>
            {campaign.title}
          </h1>
        )}
        {campaign.body && (
          <p className="k-attract-subtitle" style={{ color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.8)", fontSize: "28px", maxWidth: "800px" }}>
            {campaign.body}
          </p>
        )}
      </div>

      <button 
        className="absolute bottom-8 right-8 k-btn k-btn-ghost" 
        style={{ zIndex: 20, borderColor: "rgba(255,255,255,0.5)", color: "#fff" }}
        onClick={(e) => {
          e.stopPropagation();
          onDone();
        }}
      >
        Close
      </button>
    </div>
  );
}
