import { NextRequest } from "next/server";
import { CertificateService } from "@/lib/services/certificate.service";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const verification = await CertificateService.verifyCertificate(code);
    return apiSuccess(verification);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("NOT_FOUND", "Certificate credential not found or invalid", 404);
  }
}
