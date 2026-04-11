import NextAuth from "next-auth";
import type { UserRole } from "@prisma/client";
import { PrismaAdapter } from "@auth/prisma-adapter";
import authConfig from "./auth.config";
import { db } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      role?: UserRole;
    };
  }
}

import type { DefaultSession } from "next-auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },

  callbacks: {
    async signIn() {
      return true;
    },

    async jwt({ token }) {
      return token;
    },

    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      if (session.user && token.role) {
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },

  ...authConfig,
});

export const { GET, POST } = handlers;
