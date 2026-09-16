import type { Metadata } from "next";
import { Anton, Outfit } from "next/font/google";
import "./pickup.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "ASAP Pickup",
  robots: { index: false, follow: false },
};

export default function PickupLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${anton.variable} ${outfit.variable}`}>{children}</div>;
}