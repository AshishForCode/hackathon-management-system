import { NextResponse } from "next/server";
import { HealthService } from "@/lib/services/health.service";

export async function GET() {
  const healthData = await HealthService.checkHealth();
  return NextResponse.json(healthData, {
    status: healthData.database.status === "UP" ? 200 : 503,
  });
}

