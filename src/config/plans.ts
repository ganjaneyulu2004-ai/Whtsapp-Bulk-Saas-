export interface PlanConfig {
  id: string;
  name: string;
  price: number;
  period: string;
  popular?: boolean;
  features: string[];
  description: string;
  isTest?: boolean;
}

// Monthly OneAmple SaaS Platform Plans (Flat Monthly Fee via Razorpay)
// Meta charges per-message conversation fees directly to the client via Meta Billing Hub.
export const SUBSCRIPTION_PLANS: PlanConfig[] = [
  {
    id: "starter",
    name: "Starter",
    price: 999,
    period: "month",
    description: "Ideal for retail stores and boutiques getting started with official WhatsApp campaigns.",
    features: [
      "Unlimited WhatsApp Broadcast Campaigns",
      "1 Official WhatsApp Business Account",
      "Full AI Copywriter (English & Telugu)",
      "Excel & CSV Contacts Importer",
      "Real-time Delivery & Read (Blue Tick) Tracking",
      "Full Analytics & Downloadable Reports",
      "Automated Opt-Out (STOP) Compliance",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 2499,
    period: "month",
    popular: true,
    description: "Most popular choice for fast-growing businesses & showrooms.",
    features: [
      "Everything in Starter Plan",
      "24/7 Smart AI Auto-Reply Assistant",
      "Automated WhatsApp Appointment Bookings",
      "Unread Auto-Resend Smart Engine",
      "Lead Stage CRM Tags & Inbox Filters",
      "Priority WhatsApp Chat Support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 4999,
    period: "month",
    description: "Maximum scale for busy enterprise retailers & multi-outlet brands.",
    features: [
      "Everything in Growth Plan",
      "High-speed 20 msgs/sec Campaign Engine",
      "Custom AI Chatbot Persona & Prompt Controls",
      "Multi-Campaign Queue & Scheduling",
      "Dedicated Account Manager Support",
    ],
  },
  {
    id: "test",
    name: "Test Plan",
    price: 1,
    period: "month",
    description: "Internal sandbox plan for verifying live Razorpay payment flow.",
    features: [
      "₹1 Instant Razorpay Test Verification",
      "Full Dashboard & Analytics access",
    ],
    isTest: true,
  },
];

export const META_NOTE =
  "OneAmple charges only your flat monthly platform subscription fee. WhatsApp template conversation fees are billed directly to your business by Meta in Meta Billing Hub.";
