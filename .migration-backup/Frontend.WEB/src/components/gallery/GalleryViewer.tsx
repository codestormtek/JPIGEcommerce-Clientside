"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiGet } from "@/lib/api";

interface GalleryImage {
  id: string;
  title?: string;
  description?: string;
  sortOrder: number;
  createdAt?: string;
  mediaAsset?: {
    id: string;
    url: string;
    altText?: string;
  };
}

interface Gallery {
  id: string;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
  isVisible: boolean;
  lastModifiedAt?: string;
  createdAt?: string;
  images: GalleryImage[];
}

interface ApiResponse {
  success: boolean;
  data: Gallery[];
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks !== 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

function getCoverImage(gallery: Gallery): string {
  const sorted = [...gallery.images].sort((a, b) => a.sortOrder - b.sortOrder);
  return sorted[0]?.mediaAsset?.url || "/assets/images/grocery/15.jpg";
}

export default function GalleryViewer() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGalleries = async () => {
      try {
        const res = await apiGet<ApiResponse>("/galleries/public");
        const data = res.data ?? [];
        setGalleries(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load galleries");
      } finally {
        setLoading(false);
      }
    };
    fetchGalleries();
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (lightboxImage) {
        setLightboxImage(null);
      } else if (selectedGallery) {
        setSelectedGallery(null);
      }
    }
    if (lightboxImage && selectedGallery) {
      const images = [...selectedGallery.images].sort((a, b) => a.sortOrder - b.sortOrder);
      const currentIdx = images.findIndex((img) => img.id === lightboxImage.id);
      if (e.key === "ArrowRight" && currentIdx < images.length - 1) {
        setLightboxImage(images[currentIdx + 1]);
      }
      if (e.key === "ArrowLeft" && currentIdx > 0) {
        setLightboxImage(images[currentIdx - 1]);
      }
    }
  }, [lightboxImage, selectedGallery]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (lightboxImage) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [lightboxImage]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-5">
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  if (galleries.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">No galleries available yet.</p>
      </div>
    );
  }

  if (selectedGallery) {
    const sortedImages = [...selectedGallery.images].sort((a, b) => a.sortOrder - b.sortOrder);
    const currentIdx = lightboxImage ? sortedImages.findIndex((img) => img.id === lightboxImage.id) : -1;
    const hasPrev = currentIdx > 0;
    const hasNext = currentIdx < sortedImages.length - 1;

    return (
      <div>
        <button
          onClick={() => setSelectedGallery(null)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "0",
            marginBottom: "16px",
            color: "#555",
            fontSize: "15px",
          }}
        >
          <i className="fa-solid fa-arrow-left" />
          Back to Galleries
        </button>

        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "24px", fontWeight: 600 }}>{selectedGallery.name}</h3>
          {selectedGallery.description && (
            <p style={{ margin: 0, color: "#666", fontSize: "15px" }}>{selectedGallery.description}</p>
          )}
          <span style={{ color: "#999", fontSize: "13px" }}>
            {selectedGallery.images.length} image{selectedGallery.images.length !== 1 ? "s" : ""}
          </span>
        </div>

        {sortedImages.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {sortedImages.map((img) => (
              <div
                key={img.id}
                onClick={() => setLightboxImage(img)}
                style={{
                  cursor: "pointer",
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: "1px solid #eee",
                  background: "#fff",
                  transition: "box-shadow 0.2s, transform 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.12)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "none";
                }}
              >
                <div style={{ position: "relative", paddingTop: "66%", background: "#f5f5f5" }}>
                  <img
                    src={img.mediaAsset?.url || ""}
                    alt={img.title || img.mediaAsset?.altText || "Gallery image"}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    loading="lazy"
                  />
                </div>
                {(img.title || img.description) && (
                  <div style={{ padding: "12px 14px" }}>
                    {img.title && (
                      <h6 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 600 }}>{img.title}</h6>
                    )}
                    {img.description && (
                      <p style={{
                        margin: 0,
                        fontSize: "13px",
                        color: "#777",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}>
                        {img.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted">
            <p>This gallery has no images yet.</p>
          </div>
        )}

        {lightboxImage && (
          <div
            onClick={() => setLightboxImage(null)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.85)",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
              style={{
                position: "absolute",
                top: "16px",
                right: "20px",
                background: "none",
                border: "none",
                color: "#fff",
                fontSize: "28px",
                cursor: "pointer",
                zIndex: 10001,
                lineHeight: 1,
              }}
              aria-label="Close lightbox"
            >
              <i className="fa-solid fa-xmark" />
            </button>

            {hasPrev && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxImage(sortedImages[currentIdx - 1]); }}
                style={{
                  position: "absolute",
                  left: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  color: "#fff",
                  fontSize: "22px",
                  cursor: "pointer",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10001,
                }}
                aria-label="Previous image"
              >
                <i className="fa-solid fa-chevron-left" />
              </button>
            )}

            {hasNext && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxImage(sortedImages[currentIdx + 1]); }}
                style={{
                  position: "absolute",
                  right: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  color: "#fff",
                  fontSize: "22px",
                  cursor: "pointer",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10001,
                }}
                aria-label="Next image"
              >
                <i className="fa-solid fa-chevron-right" />
              </button>
            )}

            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "90vw",
                maxHeight: "75vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={lightboxImage.mediaAsset?.url || ""}
                alt={lightboxImage.title || "Gallery image"}
                style={{
                  maxWidth: "100%",
                  maxHeight: "75vh",
                  objectFit: "contain",
                  borderRadius: "6px",
                }}
              />
            </div>

            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                marginTop: "16px",
                textAlign: "center",
                maxWidth: "700px",
              }}
            >
              {lightboxImage.title && (
                <h4 style={{ color: "#fff", margin: "0 0 6px 0", fontSize: "20px", fontWeight: 600 }}>
                  {lightboxImage.title}
                </h4>
              )}
              {lightboxImage.description && (
                <p style={{ color: "rgba(255,255,255,0.75)", margin: 0, fontSize: "14px", lineHeight: 1.5 }}>
                  {lightboxImage.description}
                </p>
              )}
              {currentIdx >= 0 && (
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginTop: "8px", display: "inline-block" }}>
                  {currentIdx + 1} / {sortedImages.length}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: "24px",
      }}
    >
      {galleries.map((gallery) => (
        <div
          key={gallery.id}
          onClick={() => setSelectedGallery(gallery)}
          style={{
            cursor: "pointer",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid #e8e8e8",
            background: "#fff",
            transition: "box-shadow 0.2s, transform 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.1)";
            e.currentTarget.style.transform = "translateY(-3px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.transform = "none";
          }}
        >
          <div style={{ position: "relative", paddingTop: "56%", background: "#f0f0f0" }}>
            <img
              src={getCoverImage(gallery)}
              alt={gallery.name}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              loading="lazy"
            />
            <div
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "rgba(0,0,0,0.55)",
                color: "#fff",
                padding: "3px 10px",
                borderRadius: "14px",
                fontSize: "12px",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <i className="fa-regular fa-images" style={{ fontSize: "11px" }} />
              {gallery.images.length}
            </div>
          </div>

          <div style={{ padding: "14px 16px 16px" }}>
            <h5 style={{ margin: "0 0 6px 0", fontSize: "17px", fontWeight: 600 }}>{gallery.name}</h5>
            {gallery.description && (
              <p
                style={{
                  margin: "0 0 10px 0",
                  fontSize: "13px",
                  color: "#777",
                  lineHeight: 1.45,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {gallery.description}
              </p>
            )}
            {(gallery.lastModifiedAt || gallery.createdAt) && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#aaa", fontSize: "12px" }}>
                <i className="fa-regular fa-clock" style={{ fontSize: "11px" }} />
                Updated {timeAgo(gallery.lastModifiedAt || gallery.createdAt)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
