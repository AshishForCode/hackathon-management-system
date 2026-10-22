import { NextRequest } from "next/server";
import { TeamService } from "@/lib/services/team.service";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const skill = searchParams.get("skill") || undefined;

    const teams = await TeamService.listMatchmakingTeams(id, skill);
    return apiSuccess(teams);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve matchmaking board", 500);
  }
}
