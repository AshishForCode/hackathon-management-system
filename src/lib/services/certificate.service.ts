import { prisma } from "@/lib/db/prisma";
import {
  NotFoundError,
  ForbiddenError,
} from "@/lib/utils/errors";
import {
  CertificateType,
  UserRole,
  NotificationType,
  RegistrationStatus,
} from "@prisma/client";
import { SessionUser } from "@/types";
import { logger } from "@/lib/utils/logger";

export class CertificateService {
  /**
   * Bulk-generate certified verification credentials for a hackathon.
   */
  static async generateCertificates(
    hackathonIdOrSlug: string,
    user: SessionUser,
    types: CertificateType[] = [
      CertificateType.WINNER,
      CertificateType.RUNNER_UP,
      CertificateType.PARTICIPATION,
    ]
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
      throw new ForbiddenError("Only administrators can generate certificates.");
    }

    const results = await prisma.result.findMany({
      where: { hackathonId: hackathon.id },
      include: {
        team: {
          include: {
            members: { select: { userId: true } },
          },
        },
      },
    });

    return prisma.$transaction(async (tx) => {
      let createdCount = 0;

      // 1. Winner & Runner-up certificates
      for (const res of results) {
        let certType: CertificateType | null = null;
        if (res.rank === 1 && types.includes(CertificateType.WINNER)) {
          certType = CertificateType.WINNER;
        } else if (
          (res.rank === 2 || res.rank === 3) &&
          types.includes(CertificateType.RUNNER_UP)
        ) {
          certType = CertificateType.RUNNER_UP;
        }

        if (certType) {
          for (const member of res.team.members) {
            await tx.certificate.upsert({
              where: {
                userId_hackathonId_type: {
                  userId: member.userId,
                  hackathonId: hackathon.id,
                  type: certType,
                },
              },
              update: { resultId: res.id },
              create: {
                userId: member.userId,
                hackathonId: hackathon.id,
                resultId: res.id,
                type: certType,
              },
            });
            createdCount++;

            // Send notification
            await tx.notification.create({
              data: {
                userId: member.userId,
                title: "Certificate of Achievement Issued! 📜",
                message: `Your verified ${certType.replace("_", " ")} certificate for ${hackathon.title} is now available.`,
                type: NotificationType.RESULT,
                link: `/profile`,
              },
            });
          }
        }
      }

      // 2. Participation certificates for all verified registrants
      if (types.includes(CertificateType.PARTICIPATION)) {
        const registrations = await tx.registration.findMany({
          where: {
            hackathonId: hackathon.id,
            status: RegistrationStatus.APPROVED,
          },
          select: { userId: true },
        });

        for (const reg of registrations) {
          await tx.certificate.upsert({
            where: {
              userId_hackathonId_type: {
                userId: reg.userId,
                hackathonId: hackathon.id,
                type: CertificateType.PARTICIPATION,
              },
            },
            update: {},
            create: {
              userId: reg.userId,
              hackathonId: hackathon.id,
              type: CertificateType.PARTICIPATION,
            },
          });
          createdCount++;
        }
      }

      logger.info("Bulk certificates generated", {
        hackathonId: hackathon.id,
        createdCount,
      });

      return { count: createdCount };
    });
  }

  /**
   * Get all certificates earned by the current user.
   */
  static async getUserCertificates(userId: string) {
    return prisma.certificate.findMany({
      where: { userId },
      include: {
        hackathon: {
          select: {
            id: true,
            title: true,
            slug: true,
            startDate: true,
            endDate: true,
            campus: { select: { name: true, code: true } },
          },
        },
        result: {
          select: {
            rank: true,
            award: true,
            finalScore: true,
            team: { select: { name: true } },
          },
        },
      },
      orderBy: { generatedAt: "desc" },
    });
  }

  /**
   * Public certificate verification by unique certificate ID.
   */
  static async verifyCertificate(certificateId: string) {
    const cleanId = certificateId.replace(/^JECRC-CERT-/i, "").toLowerCase();
    const cert = await prisma.certificate.findUnique({
      where: { id: cleanId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            campus: { select: { name: true, code: true } },
            profile: {
              select: {
                enrollmentNo: true,
                branch: true,
                year: true,
              },
            },
          },
        },
        hackathon: {
          select: {
            id: true,
            title: true,
            slug: true,
            startDate: true,
            endDate: true,
            campus: { select: { name: true, code: true } },
            isInterCampus: true,
          },
        },
        result: {
          select: {
            rank: true,
            award: true,
            finalScore: true,
            team: { select: { name: true } },
          },
        },
      },
    });

    if (!cert) {
      throw new NotFoundError("Certificate credential", certificateId);
    }

    return {
      isValid: true,
      verificationCode: `JECRC-CERT-${cert.id.toUpperCase()}`,
      certificateId: cert.id,
      recipient: {
        name: cert.user.name,
        email: cert.user.email,
        campusName: cert.user.campus?.name || "JECRC Institution",
        enrollmentNo: cert.user.profile?.enrollmentNo || "N/A",
        branch: cert.user.profile?.branch || null,
        year: cert.user.profile?.year || null,
      },
      award: {
        type: cert.type,
        title:
          cert.result?.award ||
          (cert.type === CertificateType.WINNER
            ? "Winner • 1st Place"
            : cert.type === CertificateType.RUNNER_UP
            ? `Runner Up (${cert.result?.rank ? `${cert.result.rank}th Place` : ""})`
            : "Certificate of Participation"),
        teamName: cert.result?.team?.name || null,
        rank: cert.result?.rank || null,
      },
      hackathon: {
        title: cert.hackathon.title,
        slug: cert.hackathon.slug,
        campusName: cert.hackathon.campus?.name || "JECRC Institutions",
        isInterCampus: cert.hackathon.isInterCampus,
        eventDate: cert.hackathon.endDate || cert.hackathon.startDate,
      },
      issuedAt: cert.generatedAt.toISOString(),
    };
  }
}
