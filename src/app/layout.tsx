import { Bebas_Neue, Outfit } from "next/font/google";
import type { Metadata } from "next";
import { PLATFORM_NAME, PLATFORM_TAGLINE } from "@/lib/platform";
import "./globals.css";

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});

const body = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: PLATFORM_NAME,
  description: PLATFORM_TAGLINE,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
