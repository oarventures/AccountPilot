import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "AccountPilot · Your next best move",
  description: "A browser-only sales strategy demo for founders.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
