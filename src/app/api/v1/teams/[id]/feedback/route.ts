import { NextRequest } from "next/server";
import { EvaluationService } from "@/lib/services/evaluation.service";
import { requireAuth } from "@/lib/auth/session";
import { mentorFeedbackSchema } from "@/lib/validators/evaluation.schema";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const user = await requireAuth();
    const feedbacks = await EvaluationService.getTeamMentorFeedback(teamId, user);
    return apiSuccess(feedbacks);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve mentor feedback", 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params;
    const user = await requireAuth();

    const body = await req.json();
    const parsed = mentorFeedbackSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid feedback content",
        400
      );
    }

    const feedback = await EvaluationService.addMentorFeedback(teamId, user, parsed.data);
    return apiSuccess(feedback, undefined, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to submit mentor feedback", 500);
  }
}
