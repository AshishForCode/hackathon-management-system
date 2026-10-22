import { NextRequest } from "next/server";
import { TeamService } from "@/lib/services/team.service";
import { requireAuth } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: teamId, userId: targetUserId } = await params;
    const operator = await requireAuth();

    const result = await TeamService.removeMember(teamId, operator, targetUserId);
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to remove member from team", 500);
  }
}
