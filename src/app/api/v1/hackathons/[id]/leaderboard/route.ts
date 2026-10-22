import { NextRequest } from "next/server";
import { LeaderboardService } from "@/lib/services/leaderboard.service";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";
import { EvaluationRound } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const campusCode = searchParams.get("campus") || undefined;
    const trackId = searchParams.get("trackId") || undefined;
    const roundParam = searchParams.get("round") as EvaluationRound | null;
    const round = roundParam || undefined;

    const leaderboard = await LeaderboardService.getLeaderboard(id, {
      campusCode,
      trackId,
      round,
    });

    return apiSuccess(leaderboard);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to compute hackathon leaderboard", 500);
  }
}
