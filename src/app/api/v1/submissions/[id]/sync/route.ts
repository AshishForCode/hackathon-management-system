import { NextRequest } from "next/server";
import { SubmissionService } from "@/lib/services/submission.service";
import { requireAuth } from "@/lib/auth/session";
import { syncRepoSchema } from "@/lib/validators/submission.schema";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError, ValidationError, ForbiddenError } from "@/lib/utils/errors";
import { UserRole } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    const submission = await SubmissionService.getSubmissionById(id);

    const isMember = submission.team.members.some((m) => m.userId === user.id);
    const isAdmin =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.CAMPUS_ADMIN ||
      user.role === UserRole.ORGANIZER;

    if (!isMember && !isAdmin) {
      throw new ForbiddenError("Only team members or administrators can trigger repo sync for this submission.");
    }

    if (
      user.role === UserRole.CAMPUS_ADMIN &&
      submission.hackathon.campusId &&
      user.campusId !== submission.hackathon.campusId
    ) {
      throw new ForbiddenError("You are only authorized to manage hackathons for your assigned campus.");
    }

    let repoUrl = submission.repoUrl;

    try {
      const body = await req.json();
      const parsed = syncRepoSchema.safeParse(body);
      if (parsed.success && parsed.data.repoUrl) {
        repoUrl = parsed.data.repoUrl;
      }
    } catch {
      // Body is optional
    }

    if (!repoUrl) {
      throw new ValidationError("No Git repository URL is configured for this submission.");
    }

    const snapshot = await SubmissionService.syncRepoSnapshot(id, repoUrl, submission.hackathon);
    return apiSuccess(snapshot);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to sync Git repository", 500);
  }
}
