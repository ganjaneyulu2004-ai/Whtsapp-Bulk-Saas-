import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageContext";
import { SessionProvider } from "@/components/SessionProvider";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import { Navbar } from "@/components/Navbar";

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
      </head>
      <body className="min-h-full flex flex-col bg-pastel-blobs bg-fixed antialiased text-text-main">
        <SessionProvider>
          <LanguageProvider>
            <SubscriptionGuard>
              <Navbar />
              <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 lg:pb-8">
                {children}
              </main>
              <footer className="mt-auto border-t border-brand-soft bg-white/70 backdrop-blur-md py-6 pb-24 lg:pb-6 text-center text-xs text-slate-muted font-medium">
                <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p>iBrainLabs © 2026 – Expertise In Every Execution</p>
                  <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-4 text-brand-purple text-[11px] sm:text-xs">
                    <span>⚡ 20 Msgs/Sec Engine</span>
                    <span>•</span>
                    <span>🔒 Official Meta WhatsApp API</span>
                    <span>•</span>
                    <span>📊 Real-Time Read Tracking</span>
                  </div>
                </div>
              </footer>
            </SubscriptionGuard>
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
