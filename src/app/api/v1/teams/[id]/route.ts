import { NextRequest } from "next/server";
import { TeamService } from "@/lib/services/team.service";
import { requireAuth } from "@/lib/auth/session";
import { updateTeamSchema } from "@/lib/validators/team.schema";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

import { UserRole } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let user = null;
    try {
      user = await requireAuth();
    } catch {
      // Guest / unauthenticated visitor
    }

    const team = await TeamService.getTeamDetails(id);
    const isMember = user ? team.members.some((m) => m.userId === user.id) : false;
    const isAdmin = user
      ? user.role === UserRole.SUPER_ADMIN ||
        user.role === UserRole.CAMPUS_ADMIN ||
        user.role === UserRole.ORGANIZER
      : false;

    if (!isMember && !isAdmin) {
      const sanitized = {
        ...team,
        inviteCode: undefined,
        invites: [],
      };
      return apiSuccess(sanitized);
    }

    return apiSuccess(team);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve team details", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    const body = await req.json();
    const parsed = updateTeamSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid team updates", 400);
    }

    const updated = await TeamService.updateTeam(id, user, parsed.data);
    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to update team settings", 500);
  }
}
