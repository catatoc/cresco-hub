import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common.meta");
  return {
    metadataBase: new URL("https://portal.cresco.so"),
    title: "crescō",
    description: t("description"),
    // el preview del enlace (WhatsApp, iMessage, Slack) sale de aquí
    openGraph: {
      siteName: "crescō",
      title: "crescō · portal de clientes",
      description:
        "El estado de tu proyecto, en vivo: avances, tareas, reuniones y documentos.",
      type: "website",
      locale: "es",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "crescō · portal de clientes" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "crescō · portal de clientes",
      description:
        "El estado de tu proyecto, en vivo: avances, tareas, reuniones y documentos.",
      images: ["/og.png"],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${inter.variable} h-full`}>
      <body
        className="antialiased h-full"
        style={{ fontFeatureSettings: "'cv11', 'ss01', 'ss03'" }}
      >
        <NextIntlClientProvider>
          <QueryProvider>{children}</QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
