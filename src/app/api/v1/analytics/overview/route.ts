import { NextRequest } from "next/server";
import { AnalyticsService } from "@/lib/services/analytics.service";
import { requireAuth } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth();
    const stats = await AnalyticsService.getOverviewStats(user);
    return apiSuccess(stats);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to compile platform analytics", 500);
  }
}
