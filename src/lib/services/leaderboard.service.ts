import { prisma } from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/utils/errors";
import { EvaluationRound } from "@prisma/client";

export interface LeaderboardEntry {
  rank: number;
  submissionId: string;
  projectTitle: string;
  trackName: string;
  trackId: string | null;
  teamId: string;
  teamName: string;
  campusName: string;
  campusCode: string;
  leaderName: string;
  memberCount: number;
  repoUrl: string | null;
  demoVideoUrl: string | null;
  averageScore: number;
  evaluationsCount: number;
  criteriaBreakdown: Record<string, number>;
  submittedAt: string;
}

export class LeaderboardService {
  /**
   * Compute live hackathon leaderboard rankings.
   */
  static async getLeaderboard(
    hackathonIdOrSlug: string,
    options: {
      campusCode?: string;
      trackId?: string;
      round?: EvaluationRound;
    } = {}
  ): Promise<{
    entries: LeaderboardEntry[];
    totalTeams: number;
    campuses: Array<{ code: string; name: string }>;
    tracks: Array<{ id: string; name: string }>;
  }> {
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: hackathonIdOrSlug }, { slug: hackathonIdOrSlug }],
      },
      include: {
        tracks: true,
      },
    });

    if (!hackathon) {
      throw new NotFoundError("Hackathon", hackathonIdOrSlug);
    }

    // Fetch all campuses for filter tabs
    const campuses = await prisma.campus.findMany({
      where: { active: true },
      select: { code: true, name: true },
    });

    // Fetch all finalized submissions with their evaluations & scores
    const submissions = await prisma.submission.findMany({
      where: {
        hackathonId: hackathon.id,
        isFinal: true,
        ...(options.trackId && options.trackId !== "ALL"
          ? { trackId: options.trackId }
          : {}),
      },
      include: {
        track: true,
        team: {
          include: {
            leader: {
              include: { campus: true },
            },
            members: {
              include: { user: { include: { campus: true } } },
            },
          },
        },
        evaluations: {
          where: options.round ? { round: options.round } : undefined,
          include: {
            scores: {
              include: { criterion: true },
            },
          },
        },
      },
    });

    // Process each submission's evaluations
    const entries: LeaderboardEntry[] = [];

    for (const sub of submissions) {
      const leaderCampus = sub.team.leader.campus;
      const campusCode = leaderCampus?.code || "JECRC";
      const campusName = leaderCampus?.name || "JECRC Institutions";

      // Filter by campus if requested
      if (
        options.campusCode &&
        options.campusCode !== "ALL" &&
        campusCode !== options.campusCode
      ) {
        continue;
      }

      const evalCount = sub.evaluations.length;
      let avgScore = 0;
      const criteriaTotals: Record<string, { sum: number; count: number }> = {};

      if (evalCount > 0) {
        const totalSum = sub.evaluations.reduce(
          (acc, ev) => acc + (ev.totalScore || 0),
          0
        );
        avgScore = Math.round((totalSum / evalCount) * 10) / 10;

        // Compute average score per criterion across judges
        for (const ev of sub.evaluations) {
          for (const sc of ev.scores) {
            const name = sc.criterion.name;
            if (!criteriaTotals[name]) {
              criteriaTotals[name] = { sum: 0, count: 0 };
            }
            criteriaTotals[name].sum += sc.score;
            criteriaTotals[name].count += 1;
          }
        }
      }

      const criteriaBreakdown: Record<string, number> = {};
      for (const [name, data] of Object.entries(criteriaTotals)) {
        criteriaBreakdown[name] =
          data.count > 0 ? Math.round((data.sum / data.count) * 10) / 10 : 0;
      }

      entries.push({
        rank: 0, // Assigned after sorting
        submissionId: sub.id,
        projectTitle: sub.title,
        trackName: sub.track?.name || "General Innovation",
        trackId: sub.trackId,
        teamId: sub.team.id,
        teamName: sub.team.name,
        campusName,
        campusCode,
        leaderName: sub.team.leader.name,
        memberCount: sub.team.members.length,
        repoUrl: sub.repoUrl,
        demoVideoUrl: sub.demoVideoUrl,
        averageScore: avgScore,
        evaluationsCount: evalCount,
        criteriaBreakdown,
        submittedAt: sub.submittedAt.toISOString(),
      });
    }

    // Sort by: 1. Average score desc, 2. Technical Execution score desc, 3. Submitted time asc
    entries.sort((a, b) => {
      if (b.averageScore !== a.averageScore) {
        return b.averageScore - a.averageScore;
      }
      const bTech = b.criteriaBreakdown["Technical Execution & Architecture"] || 0;
      const aTech = a.criteriaBreakdown["Technical Execution & Architecture"] || 0;
      if (bTech !== aTech) {
        return bTech - aTech;
      }
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    });

    // Assign 1-indexed ranks
    entries.forEach((e, idx) => {
      e.rank = idx + 1;
    });

    return {
      entries,
      totalTeams: entries.length,
      campuses,
      tracks: hackathon.tracks.map((t) => ({ id: t.id, name: t.name })),
    };
  }
}
