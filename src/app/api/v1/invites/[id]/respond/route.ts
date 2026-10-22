import { NextRequest } from "next/server";
import { TeamService } from "@/lib/services/team.service";
import { requireAuth } from "@/lib/auth/session";
import { respondInviteSchema } from "@/lib/validators/team.schema";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    const body = await req.json();
    const parsed = respondInviteSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Action must specify accept (boolean)", 400);
    }

    const result = await TeamService.respondToInvite(id, user, parsed.data.accept);
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to process invitation response", 500);
  }
}
