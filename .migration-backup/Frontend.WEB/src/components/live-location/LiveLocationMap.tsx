"use client";
import React from "react";

interface Props {
  lat: number;
  lng: number;
  locationName?: string;
}

export default function LiveLocationMap({ lat, lng, locationName }: Props) {
  const query = encodeURIComponent(
    locationName ? `${locationName} @${lat},${lng}` : `${lat},${lng}`
  );
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";
  const src = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${query}&center=${lat},${lng}&zoom=15`
    : `https://www.google.com/maps?q=${lat},${lng}&output=embed`;

  return (
    <div
      style={{
        width: "100%",
        height: "350px",
        borderRadius: "12px",
        overflow: "hidden",
        border: "2px solid #eee",
      }}
    >
      <iframe
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Live Location Map"
      />
    </div>
  );
}
