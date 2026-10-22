import { NextRequest } from "next/server";
import { HackathonService } from "@/lib/services/hackathon.service";
import { requirePermission } from "@/lib/auth/session";
import { updateHackathonSchema } from "@/lib/validators/hackathon.schema";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const hackathon = await HackathonService.getHackathonByIdOrSlug(id);
    return apiSuccess(hackathon);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve hackathon", 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requirePermission("hackathon:update");

    const body = await req.json();
    const parsed = updateHackathonSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid update data",
        400,
        parsed.error.errors
      );
    }

    const updated = await HackathonService.updateHackathon(id, user, parsed.data);
    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode, error.details);
    }
    return apiError("INTERNAL_ERROR", "Failed to update hackathon", 500);
  }
}
