import { UserService } from "@/lib/services/user.service";
import { requireAuth } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function GET() {
  try {
    const user = await requireAuth();
    const profile = await UserService.getUserProfile(user.id);
    return apiSuccess(profile);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to fetch user profile", 500);
  }
}
