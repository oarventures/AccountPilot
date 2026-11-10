import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "AccountPilot · Your next best move",
  description:
    "Account-specific sales strategy with private member workspaces.",
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
