export interface PlanConfig {
  id: string;
  name: string;
  price: number;
  period: string;
  messages: number;
  popular?: boolean;
  features: string[];
  description: string;
  isTest?: boolean;
}

export interface TopUpPack {
  id: string;
  name: string;
  price: number;
  credits: number;
  perMessageRate: string;
  popular?: boolean;
}

// 1. Monthly SaaS Platform Plans (Equal Full Features, differing in message volume)
export const SUBSCRIPTION_PLANS: PlanConfig[] = [
  {
    id: "starter",
    name: "Starter",
    price: 999,
    period: "month",
    messages: 2000,
    description: "Ideal for retail stores and boutiques getting started.",
    features: [
      "2,000 WhatsApp Messages / month",
      "1 Official WhatsApp Business Account",
      "Full AI Copywriter (Telugu & English)",
      "Excel & CSV Unlimited Contacts Importer",
      "Real-time Delivery & Read (Blue Tick) tracking",
      "Unread Auto-Resend Smart Engine",
      "Full Analytics & Downloadable Reports",
      "Automated Opt-Out (STOP) Compliance",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 2499,
    period: "month",
    messages: 10000,
    popular: true,
    description: "Most popular choice for fast-growing businesses & showrooms.",
    features: [
      "10,000 WhatsApp Messages / month",
      "1 Official WhatsApp Business Account",
      "Full AI Copywriter (Telugu & English)",
      "Excel & CSV Unlimited Contacts Importer",
      "Real-time Delivery & Read (Blue Tick) tracking",
      "Unread Auto-Resend Smart Engine",
      "Full Analytics & Downloadable Reports",
      "Priority WhatsApp Chat Support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 4999,
    period: "month",
    messages: 30000,
    description: "Maximum scale for busy enterprise retailers & multi-outlet brands.",
    features: [
      "30,000 WhatsApp Messages / month",
      "1 Official WhatsApp Business Account",
      "Full AI Copywriter (Telugu & English)",
      "High-speed 20 msgs/sec queue engine",
      "Real-time Delivery & Read (Blue Tick) tracking",
      "Unread Auto-Resend Smart Engine",
      "Dedicated Account Manager Support",
    ],
  },
  {
    id: "test",
    name: "Test Plan",
    price: 1,
    period: "month",
    messages: 50,
    description: "Internal sandbox plan for verifying live Razorpay payment flow.",
    features: [
      "50 WhatsApp Messages",
      "₹1 Instant Razorpay Test Verification",
      "Full Dashboard & Analytics access",
    ],
    isTest: true,
  },
];

// 2. Credit Top-Up / Add-on Packs (Starting from 1,000 Credits)
export const CREDIT_TOPUP_PACKS: TopUpPack[] = [
  {
    id: "topup_1000",
    name: "1,000 Credits Booster",
    price: 499,
    credits: 1000,
    perMessageRate: "₹0.50",
  },
  {
    id: "topup_2500",
    name: "2,500 Credits Booster",
    price: 999,
    credits: 2500,
    perMessageRate: "₹0.40",
  },
  {
    id: "topup_5000",
    name: "5,000 Credits Festival Pack",
    price: 1999,
    credits: 5000,
    perMessageRate: "₹0.40",
    popular: true,
  },
  {
    id: "topup_10000",
    name: "10,000 Credits Mega Pack",
    price: 3499,
    credits: 10000,
    perMessageRate: "₹0.35",
  },
];

export const META_NOTE = "WhatsApp (Meta) official message charges are separate and billed directly to Meta via your linked card.";
