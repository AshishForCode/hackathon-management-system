import { prisma } from "@/lib/db/prisma";

export interface HealthCheckResult {
  status: "HEALTHY" | "UNHEALTHY";
  timestamp: string;
  uptimeSeconds: number;
  responseTimeMs: number;
  database: {
    status: "UP" | "DOWN";
    latencyMs: number;
  };
  system: {
    nodeVersion: string;
    platform: string;
    memoryUsageMB: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
    };
  };
}

export class HealthService {
  /**
   * Performs connectivity and performance checks on platform dependencies
   */
  static async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let dbStatus: "UP" | "DOWN" = "UP";
    let dbLatency = 0;

    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
    } catch {
      dbStatus = "DOWN";
    }

    const memoryUsage = process.memoryUsage();

    return {
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
  }
}
