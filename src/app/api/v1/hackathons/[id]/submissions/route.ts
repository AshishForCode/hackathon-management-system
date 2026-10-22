import { NextRequest } from "next/server";
import { SubmissionService } from "@/lib/services/submission.service";
import { requireAuth, requirePermission } from "@/lib/auth/session";
import { updateSubmissionSchema } from "@/lib/validators/submission.schema";
import { apiSuccess, apiError, parsePagination } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    // If query ?mine=true, return current user's team submission
    if (searchParams.get("mine") === "true") {
      const user = await requireAuth();
      const userSubmission = await SubmissionService.getUserTeamSubmission(id, user.id);
      return apiSuccess(userSubmission);
    }

    const { page, pageSize, skip, take } = parsePagination(searchParams);
    const trackId = searchParams.get("trackId") || undefined;
    const search = searchParams.get("search") || undefined;
    const finalOnly = searchParams.get("finalOnly") !== "false"; // default true for showcase

    const { items, total } = await SubmissionService.listSubmissions(id, {
      trackId,
      search,
      finalOnly,
      skip,
      take,
    });

    const totalPages = Math.ceil(total / pageSize);

    return apiSuccess(items, {
      page,
      pageSize,
      total,
      totalPages,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve submissions", 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requirePermission("submission:create");

    const body = await req.json();
    const parsed = updateSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid submission parameters",
        400
      );
    }

    const submission = await SubmissionService.saveDraft(id, user, parsed.data);
    return apiSuccess(submission, undefined, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to save project submission", 500);
  }
}
