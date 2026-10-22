import { NextRequest } from "next/server";
import { ResultService } from "@/lib/services/result.service";
import { requireAuth } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let user = null;
    try {
      user = await requireAuth();
    } catch {
      // Unauthenticated public request
    }

    const data = await ResultService.getHackathonResults(id, user);
    return apiSuccess(data);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve hackathon results", 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    let publish = true;
    try {
      const body = await req.json();
      if (typeof body.publish === "boolean") publish = body.publish;
    } catch {
      // Optional body
    }

    const results = await ResultService.generateResultsFromLeaderboard(id, user, publish);
    return apiSuccess(results, undefined, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to generate hackathon results", 500);
  }
}
