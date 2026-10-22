import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton.
 * In development, we attach the client to the global object to prevent
 * creating multiple instances during hot-reloading (Next.js HMR).
 * In production, a single instance is created and reused.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
