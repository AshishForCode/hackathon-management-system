import { NextRequest } from "next/server";
import { TeamService } from "@/lib/services/team.service";
import { requireAuth } from "@/lib/auth/session";
import { joinTeamSchema } from "@/lib/validators/team.schema";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = joinTeamSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid invite code", 400);
    }

    const team = await TeamService.joinTeamByCode(parsed.data.inviteCode, user);
    return apiSuccess(team);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to join team", 500);
  }
}
