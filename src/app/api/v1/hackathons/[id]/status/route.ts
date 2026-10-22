import { NextRequest } from "next/server";
import { HackathonService } from "@/lib/services/hackathon.service";
import { requirePermission } from "@/lib/auth/session";
import { updateHackathonStatusSchema } from "@/lib/validators/hackathon.schema";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requirePermission("hackathon:manage_status");

    const body = await req.json();
    const parsed = updateHackathonStatusSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid status provided",
        400,
        parsed.error.errors
      );
    }

    const updated = await HackathonService.updateStatus(id, user, parsed.data.status);
    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to update hackathon lifecycle status", 500);
  }
}
