import { prisma } from "@/lib/db/prisma";
import { HackathonStatus, UserRole, RegistrationStatus } from "@prisma/client";
import { SessionUser } from "@/types";

export class AnalyticsService {
  /**
   * Get overview statistics tailored to the user's role.
   */
  static async getOverviewStats(user: SessionUser) {
    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
    const isCampusAdmin = user.role === UserRole.CAMPUS_ADMIN;
    const isAdmin = isSuperAdmin || isCampusAdmin || user.role === UserRole.ORGANIZER;

    if (!isAdmin) {
      return this.getParticipantStats(user.id);
    }

    // Admin Analytics
    const campusFilter = isCampusAdmin && user.campusId ? { campusId: user.campusId } : {};

    const [
      totalHackathons,
      activeHackathons,
      totalRegistrations,
      totalTeams,
      totalSubmissions,
      totalCertificates,
      campuses,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.hackathon.count({ where: campusFilter }),
      prisma.hackathon.count({
        where: {
          ...campusFilter,
          status: {
            in: [
              HackathonStatus.REGISTRATION_OPEN,
              HackathonStatus.IN_PROGRESS,
              HackathonStatus.SUBMISSION_OPEN,
              HackathonStatus.EVALUATION,
            ],
          },
        },
      }),
      prisma.registration.count({
        where: campusFilter.campusId
          ? { user: { campusId: campusFilter.campusId } }
          : {},
      }),
      prisma.team.count({
        where: campusFilter.campusId
          ? { hackathon: { campusId: campusFilter.campusId } }
          : {},
      }),
      prisma.submission.count({
        where: {
          isFinal: true,
          ...(campusFilter.campusId
            ? { hackathon: { campusId: campusFilter.campusId } }
            : {}),
        },
      }),
      prisma.certificate.count({
        where: campusFilter.campusId
          ? { hackathon: { campusId: campusFilter.campusId } }
          : {},
      }),
      prisma.campus.findMany({
        where: { active: true },
        include: {
          _count: {
            select: {
              users: true,
              hackathons: true,
            },
          },
        },
      }),
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
    ]);

    // Campus breakdown
    const campusBreakdown = await Promise.all(
      campuses.map(async (c) => {
        const [studentCount, regCount, teamCount, subCount] = await Promise.all([
          prisma.user.count({ where: { campusId: c.id, role: UserRole.PARTICIPANT } }),
          prisma.registration.count({ where: { user: { campusId: c.id } } }),
          prisma.team.count({ where: { leader: { campusId: c.id } } }),
          prisma.submission.count({
            where: { isFinal: true, team: { leader: { campusId: c.id } } },
          }),
        ]);

        return {
          id: c.id,
          name: c.name,
          code: c.code,
          students: studentCount,
          registrations: regCount,
          teams: teamCount,
          submissions: subCount,
          submissionRate: regCount > 0 ? Math.round((subCount / regCount) * 100) : 0,
        };
      })
    );

    return {
      role: user.role,
      isAdmin: true,
      stats: {
        totalHackathons,
        activeHackathons,
        totalRegistrations,
        totalTeams,
        totalSubmissions,
        totalCertificates,
      },
      campusBreakdown,
      recentActivity: recentAuditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        entity: log.entity,
        userName: log.user?.name || "System",
        userRole: log.user?.role || "SYSTEM",
        createdAt: log.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Get stats for a student participant.
   */
  static async getParticipantStats(userId: string) {
    const [registrations, teamMemberships, submissions, certificates] =
      await Promise.all([
        prisma.registration.findMany({
          where: { userId },
          include: {
            hackathon: {
              select: {
                id: true,
                title: true,
                slug: true,
                status: true,
                startDate: true,
                submissionDeadline: true,
              },
            },
          },
          orderBy: { registeredAt: "desc" },
        }),
        prisma.teamMember.findMany({
          where: { userId },
          include: {
            team: {
              include: {
                hackathon: { select: { id: true, title: true, slug: true } },
                members: { select: { id: true } },
              },
            },
          },
        }),
        prisma.submission.findMany({
          where: {
            team: { members: { some: { userId } } },
          },
          include: {
            hackathon: { select: { id: true, title: true, slug: true } },
          },
        }),
        prisma.certificate.findMany({
          where: { userId },
          include: {
            hackathon: { select: { title: true } },
            result: { select: { award: true } },
          },
        }),
      ]);

    return {
      role: UserRole.PARTICIPANT,
      isAdmin: false,
      stats: {
        registrationsCount: registrations.length,
        teamsCount: teamMemberships.length,
        submissionsCount: submissions.length,
        certificatesCount: certificates.length,
      },
      myRegistrations: registrations.map((r) => ({
        id: r.id,
        status: r.status,
        registeredAt: r.registeredAt.toISOString(),
        hackathon: r.hackathon,
      })),
      myTeams: teamMemberships.map((tm) => ({
        id: tm.team.id,
        name: tm.team.name,
        role: tm.role,
        memberCount: tm.team.members.length,
        hackathon: tm.team.hackathon,
      })),
      myCertificates: certificates.map((c) => ({
        id: c.id,
        type: c.type,
        hackathonTitle: c.hackathon.title,
        award: c.result?.award || c.type,
      })),
    };
  }
}
