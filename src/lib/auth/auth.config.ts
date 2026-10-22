import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/validators/auth.schema";
import { UserRole, UserStatus } from "@prisma/client";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { profile: true },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        if (user.status === UserStatus.SUSPENDED) {
          throw new Error("ACCOUNT_SUSPENDED");
        }

        const isPasswordValid = await compare(password, user.passwordHash);
        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          campusId: user.campusId,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For Google OAuth, enforce college domain check if configured
      if (account?.provider === "google") {
        const allowedDomain = process.env.GOOGLE_ALLOWED_DOMAIN;
        if (allowedDomain && allowedDomain.trim() !== "") {
          const userEmail = user.email?.toLowerCase();
          if (!userEmail || !userEmail.endsWith(`@${allowedDomain.toLowerCase()}`)) {
            return `/login?error=InvalidDomain&domain=${encodeURIComponent(allowedDomain)}`;
          }
        }

        if (user.email) {
          // Find or auto-provision OAuth user in database
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email.toLowerCase() },
          });

          if (!existingUser) {
            // Find default JECRC University campus for auto-provisioning
            const defaultCampus = await prisma.campus.findFirst({
              where: { code: "JECRC-U" },
            });

            const createdUser = await prisma.user.create({
              data: {
                email: user.email.toLowerCase(),
                name: user.name || "JECRC Student",
                role: UserRole.PARTICIPANT,
                status: UserStatus.ACTIVE,
                emailVerified: new Date(),
                image: user.image,
                campusId: defaultCampus?.id,
                profile: {
                  create: {
                    skills: "",
                  },
                },
              },
            });

            user.id = createdUser.id;
            user.role = createdUser.role;
            user.status = createdUser.status;
            user.campusId = createdUser.campusId;
          } else {
            user.id = existingUser.id;
            user.role = existingUser.role;
            user.status = existingUser.status;
            user.campusId = existingUser.campusId;
          }
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email || "";
        token.name = user.name || "";
        token.role = user.role;
        token.status = user.status;
        token.campusId = user.campusId;
        token.image = user.image;
      }

      // Handle session updates (e.g. profile edit, role update)
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.campusId !== undefined) token.campusId = session.campusId;
        if (session.role) token.role = session.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as UserRole;
        session.user.status = token.status as UserStatus;
        session.user.campusId = token.campusId as string | null | undefined;
        session.user.image = token.image as string | null | undefined;
      }
      return session;
    },
  },
};
