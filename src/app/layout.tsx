import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageContext";
import { SessionProvider } from "@/components/SessionProvider";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import { AppShell } from "@/components/AppShell";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#6B2D8F",
};

export const metadata: Metadata = {
  title: {
    default: "iBrainLabs | Expertise In Every Execution",
    template: "iBrainLabs | %s",
  },
  description: "Official Meta WhatsApp Cloud API Marketing Engine for Businesses – Expertise In Every Execution.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans+Telugu:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-pastel-blobs bg-fixed antialiased text-text-main">
        <SessionProvider>
          <LanguageProvider>
            <SubscriptionGuard>
              <AppShell>
                {children}
              </AppShell>
            </SubscriptionGuard>
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
