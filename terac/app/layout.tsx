import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Cut Test — Video study", description: "A paired video comparison study." };

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
