import { prisma } from "@/lib/db/prisma";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/lib/utils/errors";
import { LeaderboardService } from "./leaderboard.service";
import {
  HackathonStatus,
  UserRole,
  NotificationType,
} from "@prisma/client";
import { SessionUser } from "@/types";
import { logger } from "@/lib/utils/logger";

export class ResultService {
  /**
   * Get official published results for a hackathon.
   */
  static async getHackathonResults(
    hackathonIdOrSlug: string,
    user?: SessionUser | null
  ) {
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: hackathonIdOrSlug }, { slug: hackathonIdOrSlug }],
      },
      include: {
        campus: true,
      },
    });

    if (!hackathon) {
      throw new NotFoundError("Hackathon", hackathonIdOrSlug);
    }

    const isAdmin =
      user &&
      (user.role === UserRole.SUPER_ADMIN ||
        user.role === UserRole.CAMPUS_ADMIN ||
        user.role === UserRole.ORGANIZER);

    const results = await prisma.result.findMany({
      where: {
        hackathonId: hackathon.id,
        ...(isAdmin ? {} : { publishedAt: { not: null } }),
      },
      include: {
        track: true,
        team: {
          include: {
            leader: {
              select: {
                id: true,
                name: true,
                email: true,
                campus: { select: { name: true, code: true } },
              },
            },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    campus: { select: { name: true, code: true } },
                  },
                },
              },
            },
            submissions: {
              where: { hackathonId: hackathon.id },
              take: 1,
            },
          },
        },
        certificates: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { rank: "asc" },
    });

    const isPublished = results.some((r) => r.publishedAt !== null);

    return {
      hackathon,
      results,
      isPublished,
    };
  }

  /**
   * Automatically generate official results from live leaderboard scores.
   */
  static async generateResultsFromLeaderboard(
    hackathonIdOrSlug: string,
    user: SessionUser,
    publish: boolean = true
  ) {
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: hackathonIdOrSlug }, { slug: hackathonIdOrSlug }],
      },
    });

    if (!hackathon) {
      throw new NotFoundError("Hackathon", hackathonIdOrSlug);
    }

    const isAdmin =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.CAMPUS_ADMIN ||
      user.role === UserRole.ORGANIZER;

    if (!isAdmin) {
      throw new ForbiddenError("Only organizers or administrators can publish official results.");
    }

    if (user.role === UserRole.CAMPUS_ADMIN && hackathon.campusId && user.campusId !== hackathon.campusId) {
      throw new ForbiddenError("You are only authorized to manage hackathons for your assigned campus.");
    }

    // Get current calculated standings
    const { entries } = await LeaderboardService.getLeaderboard(hackathon.id);

    if (entries.length === 0) {
      throw new ValidationError("Cannot generate results: no evaluated submissions found.");
    }

    return prisma.$transaction(async (tx) => {
      const now = publish ? new Date() : null;

      const createdResults = [];

      for (const entry of entries) {
        let award: string | null = null;
        if (entry.rank === 1) award = "Grand Champion • 1st Place";
        else if (entry.rank === 2) award = "1st Runner Up • 2nd Place";
        else if (entry.rank === 3) award = "2nd Runner Up • 3rd Place";

        const res = await tx.result.upsert({
          where: {
            hackathonId_teamId: {
              hackathonId: hackathon.id,
              teamId: entry.teamId,
            },
          },
          update: {
            rank: entry.rank,
            finalScore: entry.averageScore,
            award,
            trackId: entry.trackId,
            publishedAt: now,
          },
          create: {
            hackathonId: hackathon.id,
            teamId: entry.teamId,
            rank: entry.rank,
            finalScore: entry.averageScore,
            award,
            trackId: entry.trackId,
            publishedAt: now,
          },
        });

        createdResults.push(res);
      }

      if (publish) {
        await tx.hackathon.update({
          where: { id: hackathon.id },
          data: { status: HackathonStatus.RESULTS_PUBLISHED },
        });

        // Broadcast notification to all participants
        const registrations = await tx.registration.findMany({
          where: { hackathonId: hackathon.id },
          select: { userId: true },
        });

        for (const reg of registrations) {
          await tx.notification.create({
            data: {
              userId: reg.userId,
              title: "Official Hackathon Results Published! 🏆",
              message: `The winners and official rankings for ${hackathon.title} are now live.`,
              type: NotificationType.RESULT,
              link: `/hackathons/${hackathon.slug}/results`,
            },
          });
        }
      }

      logger.info("Official results generated from leaderboard", {
        hackathonId: hackathon.id,
        count: createdResults.length,
        published: publish,
      });

      return createdResults;
    });
  }

  /**
   * Toggle publication status of hackathon results.
   */
  static async setPublishStatus(
    hackathonIdOrSlug: string,
    user: SessionUser,
    publish: boolean
  ) {
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: hackathonIdOrSlug }, { slug: hackathonIdOrSlug }],
      },
    });

    if (!hackathon) {
      throw new NotFoundError("Hackathon", hackathonIdOrSlug);
    }

    const isAdmin =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.CAMPUS_ADMIN ||
      user.role === UserRole.ORGANIZER;

    if (!isAdmin) {
      throw new ForbiddenError("Only organizers or administrators can toggle results publication.");
    }

    if (user.role === UserRole.CAMPUS_ADMIN && hackathon.campusId && user.campusId !== hackathon.campusId) {
      throw new ForbiddenError("You are only authorized to manage hackathons for your assigned campus.");
    }

    return prisma.$transaction(async (tx) => {
      const publishedAt = publish ? new Date() : null;

      await tx.result.updateMany({
        where: { hackathonId: hackathon.id },
        data: { publishedAt },
      });

      const updatedHackathon = await tx.hackathon.update({
        where: { id: hackathon.id },
        data: {
          status: publish
            ? HackathonStatus.RESULTS_PUBLISHED
            : HackathonStatus.EVALUATION,
        },
      });

      return { success: true, published: publish, hackathon: updatedHackathon };
    });
  }
}
