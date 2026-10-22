import { NextRequest } from "next/server";
import { CertificateService } from "@/lib/services/certificate.service";
import { requireAuth } from "@/lib/auth/session";
import { generateCertificatesSchema } from "@/lib/validators/result.schema";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    let types;
    try {
      const body = await req.json();
      const parsed = generateCertificatesSchema.safeParse(body);
      if (parsed.success) {
        types = parsed.data.types;
      }
    } catch {
      // Optional body
    }

    const result = await CertificateService.generateCertificates(id, user, types);
    return apiSuccess(result, undefined, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to generate certificates", 500);
  }
}
