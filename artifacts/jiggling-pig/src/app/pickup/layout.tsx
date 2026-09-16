import type { Metadata, Viewport } from "next";
import { Anton, Outfit } from "next/font/google";
import "./pickup.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "ASAP Pickup",
  robots: { index: false, follow: false },
};

// Keep the kiosk surface at the device width. The storefront's legacy
// stylesheet sets a 10px root size, so this also makes the pickup route's
// touch and text sizing independent of that global theme.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#15110e",
};

export default function PickupLayout({ children }: { children: React.ReactNode }) {
  return <div className={`jp-pickup-root ${anton.variable} ${outfit.variable}`}>{children}</div>;
}