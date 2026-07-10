import type { Metadata, Viewport } from "next";
import "./kiosk.css";

export const metadata: Metadata = {
  title: "The Jiggling Pig — Order Here",
  robots: { index: false, follow: false },
  manifest: "/kiosk.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Order Here",
  },
  icons: {
    apple: "/kiosk-apple-touch-icon.png",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return <div className="kiosk-root">{children}</div>;
}
