import { prisma } from "@/lib/db/prisma";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "@/lib/utils/errors";
import { SubmissionInput, UpdateSubmissionInput } from "@/lib/validators/submission.schema";
import {
  HackathonStatus,
  UserRole,
  NotificationType,
  Prisma,
} from "@prisma/client";
import { SessionUser } from "@/types";
import { logger } from "@/lib/utils/logger";
import { syncGitHubRepository } from "@/lib/utils/github";

export class SubmissionService {
  /**
   * Get submission for the current user's team in a hackathon.
   */
  static async getUserTeamSubmission(hackathonIdOrSlug: string, userId: string) {
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: hackathonIdOrSlug }, { slug: hackathonIdOrSlug }],
      },
      select: { id: true, title: true, status: true, submissionDeadline: true },
    });

    if (!hackathon) {
      throw new NotFoundError("Hackathon", hackathonIdOrSlug);
    }

    const membership = await prisma.teamMember.findFirst({
      where: {
        userId,
        team: { hackathonId: hackathon.id },
      },
      include: {
        team: true,
      },
    });

    if (!membership) {
      return null;
    }

    const submission = await prisma.submission.findUnique({
      where: {
        teamId_hackathonId: {
          teamId: membership.teamId,
          hackathonId: hackathon.id,
        },
      },
      include: {
        track: true,
        repoSnapshot: true,
        versions: {
          orderBy: { version: "desc" },
          take: 5,
        },
        team: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, campus: true },
                },
              },
            },
          },
        },
      },
    });

    return {
      submission,
      team: membership.team,
      hackathon,
    };
  }

  /**
   * Get single submission by ID.
   */
  static async getSubmissionById(submissionId: string) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        track: true,
        repoSnapshot: true,
        versions: {
          orderBy: { version: "desc" },
        },
        team: {
          include: {
            leader: { select: { id: true, name: true, email: true } },
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, campus: true },
                },
              },
            },
          },
        },
        hackathon: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            submissionDeadline: true,
            startDate: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundError("Submission", submissionId);
    }

    return submission;
  }

  /**
   * Create or update draft submission for the team.
   */
  static async saveDraft(
    hackathonIdOrSlug: string,
    user: SessionUser,
    input: SubmissionInput | UpdateSubmissionInput
  ) {
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: hackathonIdOrSlug }, { slug: hackathonIdOrSlug }],
      },
    });

    if (!hackathon) {
      throw new NotFoundError("Hackathon", hackathonIdOrSlug);
    }

    // Find user's team
    const membership = await prisma.teamMember.findFirst({
      where: {
        userId: user.id,
        team: { hackathonId: hackathon.id },
      },
      include: { team: true },
    });

    if (!membership) {
      throw new ValidationError("You must be part of an active team to submit a project.");
    }

    // Check submission window
    const allowedStatuses: HackathonStatus[] = [
      HackathonStatus.SUBMISSION_OPEN,
      HackathonStatus.IN_PROGRESS,
    ];
    if (!allowedStatuses.includes(hackathon.status)) {
      throw new ValidationError(
        `Project submissions are not open for this hackathon (Status: ${hackathon.status.replace("_", " ")}).`
      );
    }

    if (hackathon.submissionDeadline && new Date() > new Date(hackathon.submissionDeadline)) {
      throw new ValidationError("The project submission deadline has elapsed.");
    }

    // Check existing submission
    const existing = await prisma.submission.findUnique({
      where: {
        teamId_hackathonId: {
          teamId: membership.teamId,
          hackathonId: hackathon.id,
        },
      },
    });

    if (existing?.isFinal) {
      throw new ConflictError(
        "Your team's submission has already been locked and finalized. Contact an organizer to reopen."
      );
    }

    return prisma.$transaction(async (tx) => {
      let submission;
      if (existing) {
        submission = await tx.submission.update({
          where: { id: existing.id },
          data: {
            title: input.title !== undefined ? input.title.trim() : undefined,
            description: input.description !== undefined ? input.description.trim() : undefined,
            techStack: input.techStack !== undefined ? input.techStack.trim() : undefined,
            trackId: input.trackId !== undefined ? input.trackId : undefined,
            demoVideoUrl: input.demoVideoUrl !== undefined ? input.demoVideoUrl : undefined,
            presentationUrl: input.presentationUrl !== undefined ? input.presentationUrl : undefined,
            repoUrl: input.repoUrl !== undefined ? input.repoUrl : undefined,
            repoProvider: input.repoProvider !== undefined ? input.repoProvider : undefined,
          },
        });
      } else {
        if (!input.title || !input.techStack || !input.repoUrl) {
          throw new ValidationError("Title, Tech Stack, and Git Repository URL are required.");
        }
        submission = await tx.submission.create({
          data: {
            teamId: membership.teamId,
            hackathonId: hackathon.id,
            title: input.title.trim(),
            description: input.description ? input.description.trim() : null,
            techStack: input.techStack.trim(),
            trackId: input.trackId || null,
            demoVideoUrl: input.demoVideoUrl || null,
            presentationUrl: input.presentationUrl || null,
            repoUrl: input.repoUrl,
            repoProvider: input.repoProvider || "GITHUB",
            isFinal: false,
          },
        });
      }

      // Record Version History
      const versionCount = await tx.submissionVersion.count({
        where: { submissionId: submission.id },
      });

      await tx.submissionVersion.create({
        data: {
          submissionId: submission.id,
          version: versionCount + 1,
          snapshot: submission as unknown as Prisma.InputJsonValue,
        },
      });

      return submission;
    });
  }

  /**
   * Finalize and lock the project submission.
   */
  static async finalizeSubmission(submissionId: string, user: SessionUser) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        team: {
          include: { members: true },
        },
        hackathon: true,
      },
    });

    if (!submission) {
      throw new NotFoundError("Submission", submissionId);
    }

    const isMember = submission.team.members.some((m) => m.userId === user.id);
    const isAdmin =
      user.role === UserRole.SUPER_ADMIN || user.role === UserRole.CAMPUS_ADMIN;

    if (!isMember && !isAdmin) {
      throw new ForbiddenError("Only team members or administrators can lock submissions.");
    }

    if (submission.isFinal) {
      return submission;
    }

    if (!submission.title || !submission.description || !submission.repoUrl) {
      throw new ValidationError(
        "Project submission must have a title, description, and repository URL before finalization."
      );
    }

    if (
      submission.hackathon.submissionDeadline &&
      new Date() > new Date(submission.hackathon.submissionDeadline)
    ) {
      throw new ValidationError("Submission deadline has passed.");
    }

    // Auto-sync Git repo if not yet synced
    try {
      if (submission.repoUrl) {
        await this.syncRepoSnapshot(submission.id, submission.repoUrl, submission.hackathon);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.warn("Repo sync warning during finalization", { error: errorMessage });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const finalized = await tx.submission.update({
        where: { id: submission.id },
        data: { isFinal: true },
        include: { repoSnapshot: true, track: true },
      });

      // Lock team roster as well
      await tx.team.update({
        where: { id: submission.teamId },
        data: { locked: true, lookingForMembers: false },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "SUBMISSION_FINALIZED",
          entity: "Submission",
          entityId: submission.id,
          newValue: { title: finalized.title, isFinal: true },
        },
      });

      // Notify all team members
      for (const member of submission.team.members) {
        await tx.notification.create({
          data: {
            userId: member.userId,
            title: "Project Submitted & Locked! 🏆",
            message: `Your project "${finalized.title}" has been finalized for jury evaluation.`,
            type: NotificationType.DEADLINE,
            link: `/hackathons/${submission.hackathon.slug}/submissions`,
          },
        });
      }

      return finalized;
    });

    return updated;
  }

  /**
   * Sync repository activity from GitHub.
   */
  static async syncRepoSnapshot(
    submissionId: string,
    repoUrl: string,
    hackathon?: { startDate?: Date | null; submissionDeadline?: Date | null }
  ) {
    const details = await syncGitHubRepository(
      repoUrl,
      hackathon?.startDate,
      hackathon?.submissionDeadline
    );

    return prisma.repoSnapshot.upsert({
      where: { submissionId },
      update: {
        totalCommits: details.totalCommits,
        contributors: details.contributors,
        languages: details.languages as Prisma.InputJsonValue,
        readme: details.readme,
        lastActivity: details.lastActivity,
        stars: details.stars,
        branches: details.branches as Prisma.InputJsonValue,
        flaggedCommits: details.flaggedCommits as Prisma.InputJsonValue,
        syncedAt: new Date(),
      },
      create: {
        submissionId,
        totalCommits: details.totalCommits,
        contributors: details.contributors,
        languages: details.languages as Prisma.InputJsonValue,
        readme: details.readme,
        lastActivity: details.lastActivity,
        stars: details.stars,
        branches: details.branches as Prisma.InputJsonValue,
        flaggedCommits: details.flaggedCommits as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * List public and jury project submissions for a hackathon.
   */
  static async listSubmissions(
    hackathonIdOrSlug: string,
    options: {
      trackId?: string;
      search?: string;
      finalOnly?: boolean;
      skip?: number;
      take?: number;
    } = {}
  ) {
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: hackathonIdOrSlug }, { slug: hackathonIdOrSlug }],
      },
    });

    if (!hackathon) {
      throw new NotFoundError("Hackathon", hackathonIdOrSlug);
    }

    const where: Prisma.SubmissionWhereInput = {
      hackathonId: hackathon.id,
      ...(options.finalOnly ? { isFinal: true } : {}),
      ...(options.trackId ? { trackId: options.trackId } : {}),
      ...(options.search
        ? {
            OR: [
              { title: { contains: options.search, mode: "insensitive" } },
              { techStack: { contains: options.search, mode: "insensitive" } },
              { description: { contains: options.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        skip: options.skip ?? 0,
        take: options.take ?? 20,
        include: {
          track: true,
          repoSnapshot: true,
          team: {
            include: {
              leader: {
                select: {
                  id: true,
                  name: true,
                  campus: { select: { name: true, code: true } },
                },
              },
              members: {
                include: {
                  user: {
                    select: { id: true, name: true, campus: { select: { code: true } } },
                  },
                },
              },
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      }),
      prisma.submission.count({ where }),
    ]);

    return { items, total };
  }
}
