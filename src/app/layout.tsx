import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OTwoOne — Studio · Consultancy · Branding",
  description:
    "Cork-based coding studio, consultancy, and branding practice. Outcome-led delivery for growing companies across Ireland and the UK.",
  openGraph: {
    title: "OTwoOne — Studio · Consultancy · Branding",
    description:
      "Cork-based coding studio, consultancy, and branding practice. Outcome-led delivery for growing companies across Ireland and the UK.",
    url: "https://otwoone.ie",
    siteName: "OTwoOne",
    locale: "en_IE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OTwoOne — Studio · Consultancy · Branding",
    description:
      "Cork-based coding studio, consultancy, and branding practice. Outcome-led delivery for growing companies across Ireland and the UK.",
  },
  metadataBase: new URL("https://otwoone.ie"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
