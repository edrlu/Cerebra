import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cerebra — TRIBE v2 video response explorer",
  description: "Explore population-average cortical response predictions from video with Meta TRIBE v2.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
