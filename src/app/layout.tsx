import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { ToastProvider } from "@/components/ui/Toast";
import { ServiceWorker } from "@/components/shell/ServiceWorker";
import "./globals.css";

// Figtree: open shapes, clear at small sizes, a light download. Self-hosted by next/font.
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-figtree",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return {
    title: { default: "SabbathLink", template: "%s · SabbathLink" },
    description: t("metaDescription"),
    applicationName: "SabbathLink",
    appleWebApp: { capable: true, title: "SabbathLink", statusBarStyle: "default" },
    icons: { icon: "/icon.svg", apple: "/icon.svg" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F6F2" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1719" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Applies the saved Appearance choice before first paint, so there's no flash.
const themeScript = `try{var t=localStorage.getItem("sl_theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={figtree.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider>
          <ToastProvider>{children}</ToastProvider>
        </NextIntlClientProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
