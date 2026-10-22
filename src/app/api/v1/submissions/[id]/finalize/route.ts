import { NextRequest } from "next/server";
import { SubmissionService } from "@/lib/services/submission.service";
import { requireAuth } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    const finalized = await SubmissionService.finalizeSubmission(id, user);
    return apiSuccess(finalized);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to finalize project submission", 500);
  }
}
