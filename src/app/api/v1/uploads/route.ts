import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { UploadService } from "@/lib/services/upload.service";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    const result = await UploadService.handleFileUpload(file);
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to upload file", 500);
  }
}
