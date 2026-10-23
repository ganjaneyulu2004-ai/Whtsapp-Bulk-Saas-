import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "offerblast-secret-super-key-2026-production",
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        isInstagram: { label: "isInstagram", type: "text" },
        name: { label: "name", type: "text" },
      },
      async authorize(credentials) {
        // 1. Direct Instagram One-Click Login / Onboarding
        if (credentials?.isInstagram === "true" && credentials?.username) {
          const clean = credentials.username.trim().toLowerCase();
          let user = await prisma.user.findFirst({
            where: {
              OR: [
                { username: clean },
                { username: credentials.username.trim() },
              ],
            },
          });

          if (!user) {
            const randomPass = await bcrypt.hash("ig_pass_" + Date.now(), 10);
            user = await prisma.user.create({
              data: {
                name: credentials.name || credentials.username,
                username: clean,
                passwordHash: randomPass,
                businessName: `${credentials.name || clean}'s Business`,
                role: "USER",
              },
            });

            const userBusiness = await prisma.business.create({
              data: {
                userId: user.id,
                name: user.businessName || "My Business",
                language: "en",
              },
            });

            await prisma.whatsAppConfig.create({
              data: {
                businessId: userBusiness.id,
                waApiVersion: "v26.0",
                messagingLimitTier: "TIER_250",
                isConnected: true,
                displayPhoneNumber: "+91 96426 83699",
                verifiedName: "SaaS by IBrainLabs",
                qualityRating: "High (Green)",
                connectionMethod: "OFFICIAL_OFFICE_API",
                waPhoneNumberId: process.env.WA_PHONE_NUMBER_ID || "1443849605471143",
                waBusinessAccountId: process.env.WA_BUSINESS_ACCOUNT_ID || "2367270804076581",
                waToken: process.env.WA_TOKEN || null,
              },
            });

            await prisma.subscription.create({
              data: {
                userId: user.id,
                plan: "Instagram Onboarding Plan",
                amount: 0,
                status: "ACTIVE",
                startDate: new Date(),
                endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              },
            });
          }

          return {
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role,
            businessName: user.businessName,
            mobile: user.mobile,
          };
        }

        // 2. Standard Username & Password Login
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Please enter username and password");
        }

        const raw = credentials.username.trim();
        const clean = raw.toLowerCase();
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { username: clean },
              { username: raw },
              { mobile: raw },
              { email: clean },
            ],
          },
        });

        if (!user) {
          throw new Error("Wrong username or password");
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error("Wrong username or password");
        }

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          businessName: user.businessName,
          mobile: user.mobile,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.businessName = user.businessName;
        token.mobile = user.mobile;
      }

      // Populate latest subscriptionStatus - All users always ACTIVE
      token.subscriptionStatus = "ACTIVE";

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.businessName = token.businessName as string | undefined;
        session.user.mobile = token.mobile as string | undefined;
        session.user.subscriptionStatus = (token.subscriptionStatus as string) || "AWAITING_PAYMENT";
      }
      return session;
    },
  },
};
