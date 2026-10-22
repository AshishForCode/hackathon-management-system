import { NextRequest } from "next/server";
import { EvaluationService } from "@/lib/services/evaluation.service";
import { requirePermission } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";
import { EvaluationRound } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requirePermission("evaluation:read");
    const { searchParams } = new URL(req.url);
    const roundParam = searchParams.get("round") as EvaluationRound | null;
    const round = roundParam || EvaluationRound.FINAL;

    const queue = await EvaluationService.getJuryEvaluationQueue(id, user, round);
    return apiSuccess(queue);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve evaluation queue", 500);
  }
}
