import { NextRequest } from "next/server";
import { EvaluationService } from "@/lib/services/evaluation.service";
import { requireAuth } from "@/lib/auth/session";
import { submitEvaluationSchema } from "@/lib/validators/evaluation.schema";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: submissionId } = await params;
    const user = await requireAuth();

    const body = await req.json();
    const parsed = submitEvaluationSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid evaluation score data",
        400
      );
    }

    const evaluation = await EvaluationService.submitEvaluation(submissionId, user, parsed.data);
    return apiSuccess(evaluation, undefined, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to submit evaluation scores", 500);
  }
}
