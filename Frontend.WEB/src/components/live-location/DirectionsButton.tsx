"use client";
import React from "react";

interface Props {
  lat: number;
  lng: number;
  locationName?: string;
}

export default function DirectionsButton({ lat, lng, locationName }: Props) {
  const destination = encodeURIComponent(
    locationName ? `${locationName}` : `${lat},${lng}`
  );
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=&travelmode=driving`;
  const appleMapsUrl = `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;

  const isApple =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);

  const mapsUrl = isApple ? appleMapsUrl : googleMapsUrl;

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="rts-btn btn-primary"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        padding: "14px 32px",
        fontSize: "18px",
        fontWeight: "600",
        borderRadius: "8px",
        textDecoration: "none",
      }}
    >
      <i className="fa-solid fa-diamond-turn-right"></i>
      Get Directions
    </a>
  );
}
