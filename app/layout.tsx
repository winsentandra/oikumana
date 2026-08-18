import type { Metadata, Viewport } from "next";
import { Literata, Onest } from "next/font/google";
import "./globals.css";

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

// Only 400 and 800 are actually used across the UI — everything else in the
// font's range would ship weight for no consumer.
const sans = Onest({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Oikumana — Catholic churches of Indonesia",
  description:
    "An interactive catalogue map of the Catholic churches of Indonesia. History, address, consecration date and nearby transit for every parish, starting with the Archdiocese of Jakarta.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#FAF5EC",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // next/font's variables must live on the same element as :root — Tailwind's
    // @theme resolves `--font-body: var(--font-literata)…` at :root, and custom
    // properties inherit their already-computed value, not a live reference. If
    // --font-literata were only defined on <body>, --font-body would compute to
    // invalid at :root (before that variable exists) and stay broken on inherit.
    <html lang="en" className={`${literata.variable} ${sans.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
