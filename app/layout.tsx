import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hub",
  description: "Tu proyecto. Sin abrir Notion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full`}>
      <body
        className="antialiased h-full"
        style={{ fontFeatureSettings: "'cv11', 'ss01', 'ss03'" }}
      >
        {children}
      </body>
    </html>
  );
}
