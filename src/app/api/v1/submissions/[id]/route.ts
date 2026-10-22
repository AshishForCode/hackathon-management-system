import { NextRequest } from "next/server";
import { SubmissionService } from "@/lib/services/submission.service";
import { requireAuth } from "@/lib/auth/session";
import { updateSubmissionSchema } from "@/lib/validators/submission.schema";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError, ForbiddenError } from "@/lib/utils/errors";
import { UserRole } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const submission = await SubmissionService.getSubmissionById(id);
    return apiSuccess(submission);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve submission", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    const body = await req.json();
    const parsed = updateSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid update data",
        400
      );
    }

    const submission = await SubmissionService.getSubmissionById(id);

    const isMember = submission.team.members.some((m) => m.userId === user.id);
    const isAdmin =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.CAMPUS_ADMIN ||
      user.role === UserRole.ORGANIZER;

    if (!isMember && !isAdmin) {
      throw new ForbiddenError("Only team members or administrators can update this submission.");
    }

    if (
      user.role === UserRole.CAMPUS_ADMIN &&
      submission.hackathon.campusId &&
      user.campusId !== submission.hackathon.campusId
    ) {
      throw new ForbiddenError("You are only authorized to manage hackathons for your assigned campus.");
    }

    const updated = await SubmissionService.saveDraft(submission.hackathonId, user, parsed.data);
    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to update submission", 500);
  }
}
