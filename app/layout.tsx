import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "ClearPath ER — Reduce ER Congestion",
  description: "Model ER placement, triage by severity, and route patients. For Ontario healthcare and civilians.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakarta.variable} antialiased font-sans`}
      >
        {children}
        <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js" async></script>
      </body>
    </html>
  );
}
