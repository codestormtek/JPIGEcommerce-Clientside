"use client";
import React, { useState, useEffect } from "react";
import { apiGet } from "@/lib/api";
import LiveLocationMap from "./LiveLocationMap";
import DirectionsButton from "./DirectionsButton";
import SmsSignupForm from "./SmsSignupForm";

interface LiveSession {
  id: string;
  title: string;
  locationName: string;
  address: string | null;
  lat: number;
  lng: number;
  mapUrl: string | null;
  message: string | null;
  startTime: string | null;
  endTime: string | null;
  status: string;
  isPublished: boolean;
}

export default function LiveLocationStatus() {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchSession = async () => {
      try {
        const raw = await apiGet<{ data: LiveSession | null }>("/live-sessions/public/current");
        const data = (raw as any).data ?? raw;
        if (mounted) setSession(data);
      } catch {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchSession();
    const interval = setInterval(fetchSession, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="rts-section-gap">
        <div className="container">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Checking live status...</p>
          </div>
        </div>
      </div>
    );
  }

  if (session && session.status === "LIVE") {
    const startTime = session.startTime
      ? new Date(session.startTime).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      : null;
    const endTime = session.endTime
      ? new Date(session.endTime).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      : null;
    const hours =
      startTime && endTime ? `${startTime} - ${endTime}` : startTime ? `Starting ${startTime}` : null;

    return (
      <div className="rts-section-gap">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div style={{ textAlign: "center", marginBottom: "32px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 20px",
                    background: "#e8f5e9",
                    color: "#2e7d32",
                    borderRadius: "24px",
                    fontSize: "16px",
                    fontWeight: "600",
                    marginBottom: "16px",
                  }}
                >
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: "#4CAF50",
                      display: "inline-block",
                      animation: "pulse 2s infinite",
                    }}
                  ></span>
                  We&apos;re Live!
                </span>
                <h2 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "8px", marginTop: "12px" }}>
                  {session.title || session.locationName}
                </h2>
                <p style={{ fontSize: "18px", color: "#666", marginBottom: "4px" }}>
                  <i className="fa-solid fa-location-dot" style={{ marginRight: "8px", color: "#ff8c00" }}></i>
                  {session.locationName}
                  {session.address && ` — ${session.address}`}
                </p>
                {hours && (
                  <p style={{ fontSize: "16px", color: "#888" }}>
                    <i className="fa-regular fa-clock" style={{ marginRight: "8px" }}></i>
                    {hours}
                  </p>
                )}
              </div>

              {session.message && (
                <div
                  style={{
                    padding: "16px 20px",
                    background: "#fff8f0",
                    borderRadius: "8px",
                    border: "1px solid #ffe0b2",
                    marginBottom: "24px",
                    fontSize: "16px",
                    color: "#333",
                    textAlign: "center",
                  }}
                >
                  {session.message}
                </div>
              )}

              {session.lat && session.lng && (
                <div style={{ marginBottom: "24px" }}>
                  <LiveLocationMap
                    lat={Number(session.lat)}
                    lng={Number(session.lng)}
                    locationName={session.locationName}
                  />
                </div>
              )}

              {session.lat && session.lng && (
                <div style={{ textAlign: "center", marginBottom: "40px" }}>
                  <DirectionsButton
                    lat={Number(session.lat)}
                    lng={Number(session.lng)}
                    locationName={session.locationName}
                  />
                </div>
              )}

              <SmsSignupForm />
            </div>
          </div>
        </div>
        <style jsx global>{`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.4; }
            100% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="rts-section-gap">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div style={{ textAlign: "center", marginBottom: "40px" }}>
              <div style={{ fontSize: "64px", marginBottom: "16px" }}>
                <i className="fa-solid fa-fire" style={{ color: "#ccc" }}></i>
              </div>
              <h2 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "12px" }}>
                We&apos;re Not Roadside Right Now
              </h2>
              <p style={{ fontSize: "18px", color: "#666", marginBottom: "32px", maxWidth: "500px", margin: "0 auto 32px" }}>
                The smoker is resting, but we&apos;ll be back! Sign up below to get a text
                the moment we fire up at a new location.
              </p>
            </div>

            <div className="row justify-content-center">
              <div className="col-md-8 col-lg-6">
                <SmsSignupForm />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
