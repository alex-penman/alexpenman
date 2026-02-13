import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import { AvatarConfigProvider } from "./components/AvatarConfigProvider";
import { AudioElementProvider } from "./components/AudioElementProvider";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700", "900"]
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Alex Penman · Teacher & Coder",
  description:
    "Alex Penman is a teacher and coder. This site highlights a carefully curated mind-map of his work, values, and professional story."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${spaceGrotesk.variable}`}>
      <body>
        <div className="ambient" />
        <AvatarConfigProvider>
          <AudioElementProvider>
            {children}
          </AudioElementProvider>
        </AvatarConfigProvider>
      </body>
    </html>
  );
}
