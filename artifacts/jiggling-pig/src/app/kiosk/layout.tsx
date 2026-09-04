import type { Metadata, Viewport } from "next";
import { Anton, Outfit } from "next/font/google";
import "./kiosk.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

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
  return <div className={`kiosk-root ${anton.variable} ${outfit.variable}`}>{children}</div>;
}
