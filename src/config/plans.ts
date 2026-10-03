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

export const SUBSCRIPTION_PLANS: PlanConfig[] = [
  {
    id: "starter",
    name: "Starter",
    price: 999,
    period: "month",
    messages: 2000,
    description: "Perfect for single location retail shops and boutique stores.",
    features: [
      "2,000 WhatsApp Messages / month",
      "1 WhatsApp Business Number",
      "Standard CSV Contact Importer",
      "Real-time Delivery & Read tracking",
      "Automated Opt-Out & Compliance",
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
      "1 WhatsApp Business Number",
      "AI Offer & Copywriter (Telugu & English)",
      "Advanced Delivery & Read analytics reports",
      "Dynamic Customer Tagging & Resend Engine",
      "Email & WhatsApp Chat Support",
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
      "High-speed 20 msgs/sec queue engine",
      "Priority WhatsApp API Support",
      "Custom Campaign Templates & Headers",
      "Dedicated Onboarding & Account Manager",
      "Real-time Read Rate optimization",
    ],
  },
  {
    id: "test",
    name: "Test Plan",
    price: 1,
    period: "month",
    messages: 50,
    description: "Internal sandbox plan for verifying end-to-end UPI payment approval.",
    features: [
      "50 WhatsApp Messages",
      "₹1 Instant Test Verification",
      "Full Dashboard & Analytics access",
    ],
    isTest: true,
  },
];

export const META_NOTE = "WhatsApp (Meta) message charges are separate.";
