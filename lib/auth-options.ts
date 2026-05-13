import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { env } from "@/lib/env";
import prisma from "@/lib/prisma";

import { logAudit } from "./audit";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();

        if (!email || !credentials?.password) {
          throw new Error("Credenciais inválidas");
        }

        const user = await prisma.user.findUnique({
          where: {
            email,
          },
        });

        if (!user || !user.password) {
          throw new Error("Usuário não encontrado");
        }

        if (!user.active) {
          throw new Error("Usuário inativo");
        }

        const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordCorrect) {
          throw new Error("Senha incorreta");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      await logAudit({
        userId: user.id,
        action: "LOGIN",
        entity: "User",
        entityId: user.id,
        details: `Login realizado por ${user.name || user.email}`,
        newValue: { email: user.email, timestamp: new Date() },
      });
    },
    async signOut({ token }) {
      if (token?.id) {
        await logAudit({
          userId: token.id as string,
          action: "LOGOUT",
          entity: "User",
          entityId: token.id as string,
          details: "Logoff realizado pelo usuário",
        });
      }
    },
  },
};
