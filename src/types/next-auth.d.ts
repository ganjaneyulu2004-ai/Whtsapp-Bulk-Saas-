import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
      businessName?: string | null;
      mobile?: string | null;
      subscriptionStatus?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username: string;
    role: string;
    businessName?: string | null;
    mobile?: string | null;
    subscriptionStatus?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: string;
    businessName?: string | null;
    mobile?: string | null;
    subscriptionStatus?: string | null;
  }
}

