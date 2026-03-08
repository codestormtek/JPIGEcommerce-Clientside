"use client";

import React, { useState, useEffect } from "react";
import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/image-gallery.css";
import { apiGet } from "@/lib/api";

interface GalleryImage {
  id: string;
  title?: string;
  description?: string;
  sortOrder: number;
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
  images: GalleryImage[];
}

interface ApiResponse {
  success: boolean;
  data: Gallery[];
}

export default function GalleryViewer() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [activeGallery, setActiveGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGalleries = async () => {
      try {
        const res = await apiGet<ApiResponse>("/galleries/public");
        const data = res.data ?? [];
        setGalleries(data);
        if (data.length > 0) setActiveGallery(data[0]);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load galleries");
      } finally {
        setLoading(false);
      }
    };
    fetchGalleries();
  }, []);

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

  const galleryItems =
    [...(activeGallery?.images ?? [])]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((img) => ({
        original: img.mediaAsset?.url ?? "",
        thumbnail: img.mediaAsset?.url ?? "",
        originalAlt: img.title || img.mediaAsset?.altText || "Gallery image",
        thumbnailAlt: img.title || img.mediaAsset?.altText || "Gallery image",
        description: img.title || undefined,
      })) ?? [];

  return (
    <div>
      {galleries.length > 1 && (
        <div className="gallery-tabs d-flex flex-wrap justify-content-center gap-2 mb-4">
          {galleries.map((g) => (
            <button
              key={g.id}
              className={`btn ${activeGallery?.id === g.id ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setActiveGallery(g)}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {activeGallery && (
        <div>
          {activeGallery.description && (
            <p className="text-center text-muted mb-4">{activeGallery.description}</p>
          )}

          {galleryItems.length > 0 ? (
            <ImageGallery
              items={galleryItems}
              showPlayButton={true}
              showFullscreenButton={true}
              showThumbnails={true}
              showNav={true}
              showBullets={true}
              infinite={true}
              slideInterval={3000}
              slideDuration={450}
              thumbnailPosition="bottom"
              lazyLoad={true}
            />
          ) : (
            <div className="text-center py-4 text-muted">
              <p>This gallery has no images yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
