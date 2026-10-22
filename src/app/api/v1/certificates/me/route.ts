import { CertificateService } from "@/lib/services/certificate.service";
import { requireAuth } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function GET() {
  try {
    const user = await requireAuth();
    const certificates = await CertificateService.getUserCertificates(user.id);
    return apiSuccess(certificates);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve certificates", 500);
  }
}
