import { CampusService } from "@/lib/services/campus.service";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function GET() {
  try {
    const campuses = await CampusService.listCampuses();
    return apiSuccess(campuses);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve campuses", 500);
  }
}
