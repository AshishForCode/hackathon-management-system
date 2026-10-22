import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export interface ArchiveFilterOptions {
  campusCode?: string;
  hackathonId?: string;
  winnersOnly?: boolean;
  search?: string;
  techStack?: string;
  skip?: number;
  take?: number;
}

export class ArchiveService {
  /**
   * Search and retrieve projects from the permanent multi-campus innovation archive.
   */
  static async getProjectArchive(options: ArchiveFilterOptions = {}) {
    const where: Prisma.SubmissionWhereInput = {
      isFinal: true,
      ...(options.hackathonId ? { hackathonId: options.hackathonId } : {}),
      ...(options.winnersOnly
        ? {
            team: {
              results: { some: { publishedAt: { not: null } } },
            },
          }
        : {}),
      ...(options.techStack
        ? {
            techStack: { contains: options.techStack, mode: "insensitive" },
          }
        : {}),
      ...(options.search
        ? {
            OR: [
              { title: { contains: options.search, mode: "insensitive" } },
              { description: { contains: options.search, mode: "insensitive" } },
              { techStack: { contains: options.search, mode: "insensitive" } },
              { team: { name: { contains: options.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    // If filtered by campus:
    if (options.campusCode && options.campusCode !== "ALL") {
      where.team = {
        ...((where.team as Prisma.TeamWhereInput) || {}),
        leader: {
          campus: { code: options.campusCode },
        },
      };
    }

    const [items, total, campuses, hackathons] = await Promise.all([
      prisma.submission.findMany({
        where,
        skip: options.skip ?? 0,
        take: options.take ?? 24,
        include: {
          track: true,
          repoSnapshot: true,
          hackathon: {
            select: {
              id: true,
              title: true,
              slug: true,
              startDate: true,
              endDate: true,
              isInterCampus: true,
              campus: { select: { code: true, name: true } },
            },
          },
          team: {
            include: {
              leader: {
                select: {
                  id: true,
                  name: true,
                  campus: { select: { code: true, name: true } },
                },
              },
              results: {
                select: {
                  rank: true,
                  award: true,
                  publishedAt: true,
                },
              },
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      campus: { select: { code: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      }),
      prisma.submission.count({ where }),
      prisma.campus.findMany({
        where: { active: true },
        select: { code: true, name: true },
      }),
      prisma.hackathon.findMany({
        select: { id: true, title: true, slug: true },
        orderBy: { startDate: "desc" },
      }),
    ]);

    const formattedProjects = items.map((item) => {
      const result = item.team.results[0] || null;
      const isWinner = Boolean(result && result.publishedAt);

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        techStack: item.techStack,
        repoUrl: item.repoUrl,
        demoVideoUrl: item.demoVideoUrl,
        presentationUrl: item.presentationUrl,
        trackName: item.track?.name || "General Track",
        submittedAt: item.submittedAt.toISOString(),
        hackathon: {
          id: item.hackathon.id,
          title: item.hackathon.title,
          slug: item.hackathon.slug,
          year: item.hackathon.startDate
            ? new Date(item.hackathon.startDate).getFullYear()
            : new Date().getFullYear(),
        },
        campus: item.team.leader.campus || { code: "JECRC", name: "JECRC Institutions" },
        team: {
          id: item.team.id,
          name: item.team.name,
          leaderName: item.team.leader.name,
          membersCount: item.team.members.length,
          members: item.team.members.map((m) => m.user.name),
        },
        award: isWinner ? result?.award || `Rank #${result?.rank}` : null,
        repoStats: item.repoSnapshot
          ? {
              commits: item.repoSnapshot.totalCommits,
              stars: item.repoSnapshot.stars,
              contributors: item.repoSnapshot.contributors,
              languages: item.repoSnapshot.languages,
            }
          : null,
      };
    });

    return {
      projects: formattedProjects,
      total,
      campuses,
      hackathons,
    };
  }
}
