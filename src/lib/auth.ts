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
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Please enter username and password");
        }

        const username = credentials.username.trim();
        const user = await prisma.user.findUnique({
          where: { username },
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
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.businessName = token.businessName as string | undefined;
        session.user.mobile = token.mobile as string | undefined;
      }
      return session;
    },
  },
};
