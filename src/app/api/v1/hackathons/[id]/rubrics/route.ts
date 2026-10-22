import { NextRequest } from "next/server";
import { EvaluationService } from "@/lib/services/evaluation.service";
import { requireAuth } from "@/lib/auth/session";
import { createRubricSchema } from "@/lib/validators/evaluation.schema";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";
import { EvaluationRound } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const roundParam = searchParams.get("round") as EvaluationRound | null;
    const round = roundParam || EvaluationRound.FINAL;

    const rubric = await EvaluationService.getHackathonRubric(id, round);
    return apiSuccess(rubric);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve scoring rubric", 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    const body = await req.json();
    const parsed = createRubricSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid rubric configuration",
        400
      );
    }

    const rubric = await EvaluationService.createOrUpdateRubric(id, user, parsed.data);
    return apiSuccess(rubric, undefined, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to configure rubric", 500);
  }
}
