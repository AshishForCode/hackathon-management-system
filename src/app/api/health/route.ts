import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "UP";
  let dbLatency = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
  } catch {
    dbStatus = "DOWN";
  }

  const memoryUsage = process.memoryUsage();

  const healthData = {
    status: dbStatus === "UP" ? "HEALTHY" : "UNHEALTHY",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    responseTimeMs: Date.now() - startTime,
    database: {
      status: dbStatus,
      latencyMs: dbLatency,
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsageMB: {
        rss: Math.round(memoryUsage.rss / (1024 * 1024)),
        heapUsed: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
        heapTotal: Math.round(memoryUsage.heapTotal / (1024 * 1024)),
      },
    },
  };

  return NextResponse.json(healthData, {
    status: dbStatus === "UP" ? 200 : 503,
  });
}
