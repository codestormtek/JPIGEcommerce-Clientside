import React from "react";
import Link from "next/link";
import HeaderOne from "@/components/header/HeaderOne";
import FooterOne from "@/components/footer/FooterOne";
import GalleryViewer from "@/components/gallery/GalleryViewer";

export default function GalleryPage() {
  return (
    <div className="demo-one">
      <HeaderOne />

      <div className="breadcrumb-area bg-light py-4">
        <div className="container">
          <div className="d-flex align-items-center gap-2">
            <Link href="/" className="text-muted">
              Home
            </Link>
            <span className="text-muted">/</span>
            <span className="text-dark fw-semibold">Gallery</span>
          </div>
        </div>
      </div>

      <div className="rts-section-gap">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="title">Our Gallery</h2>
            <p className="text-muted">Browse through our photo collections</p>
          </div>
          <GalleryViewer />
        </div>
      </div>

      <FooterOne />
    </div>
  );
}
