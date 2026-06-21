import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "percept — brain-response explorer for video",
  description: "Generate an ad, see how the population-average brain responds with Meta TRIBE v2, and refine the weak moments.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
