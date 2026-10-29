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
  themeColor: "#03173D",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://oneample.com"),
  title: {
    default: "OneAmple — Official Meta WhatsApp Cloud API Marketing Engine & AI CRM | by iBrainLabs",
    template: "%s | OneAmple",
  },
  description: "OneAmple — Business, Made Intelligent. Official Meta WhatsApp Cloud API Marketing Engine, 24/7 Smart AI Auto-Bookings, Bulk WhatsApp Campaigns & Lead CRM for Modern Businesses in India.",
  keywords: [
    "OneAmple",
    "One Ample",
    "iBrainLabs",
    "WhatsApp Marketing Software",
    "Bulk WhatsApp Marketing",
    "Meta WhatsApp Cloud API",
    "WhatsApp Bulk SaaS",
    "WhatsApp Chatbot India",
    "WhatsApp Business API Solution",
    "Automated WhatsApp Campaigns",
    "WhatsApp Lead Management CRM",
    "AI Appointment Booking WhatsApp",
    "Official Meta Partner WhatsApp API",
  ],
  authors: [{ name: "iBrainLabs", url: "https://oneample.com" }],
  creator: "iBrainLabs",
  publisher: "iBrainLabs",
  applicationName: "OneAmple",
  alternates: {
    canonical: "https://oneample.com",
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "OneAmple — Business, Made Intelligent. | Official Meta WhatsApp SaaS",
    description: "Meta Verified WhatsApp Cloud API Bulk Marketing Engine, AI Auto-Bookings & Lead CRM for Modern Businesses.",
    url: "https://oneample.com",
    siteName: "OneAmple",
    images: [
      {
        url: "/brand/oneample-logo-horizontal.png",
        width: 1200,
        height: 630,
        alt: "OneAmple — Business, Made Intelligent.",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OneAmple — Official Meta WhatsApp Cloud API Engine | by iBrainLabs",
    description: "Scale your business with Official Meta WhatsApp Cloud API campaigns, 24/7 AI lead qualification, and appointment automation.",
    images: ["/brand/oneample-logo-horizontal.png"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "technology",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://oneample.com/#organization",
      "name": "OneAmple",
      "legalName": "OneAmple by iBrainLabs",
      "url": "https://oneample.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://oneample.com/brand/oneample-logo.png"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "email": "support@oneample.com",
        "availableLanguage": ["English", "Telugu", "Hindi"]
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://oneample.com/#website",
      "url": "https://oneample.com",
      "name": "OneAmple",
      "publisher": {
        "@id": "https://oneample.com/#organization"
      },
      "inLanguage": "en-IN"
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://oneample.com/#software",
      "name": "OneAmple WhatsApp SaaS",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "All modern web browsers",
      "offers": {
        "@type": "Offer",
        "price": "999",
        "priceCurrency": "INR"
      },
      "description": "Enterprise-grade WhatsApp Bulk Messaging, AI Auto-Replies, Lead Management, and Meta Cloud API platform."
    }
  ]
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
