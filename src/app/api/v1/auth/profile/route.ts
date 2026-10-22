import { NextRequest } from "next/server";
import { UserService } from "@/lib/services/user.service";
import { requireAuth } from "@/lib/auth/session";
import { profileUpdateSchema } from "@/lib/validators/auth.schema";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid profile data",
        400,
        parsed.error.errors
      );
    }

    const updatedProfile = await UserService.updateUserProfile(user.id, parsed.data);
    return apiSuccess(updatedProfile);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to update profile", 500);
  }
}
