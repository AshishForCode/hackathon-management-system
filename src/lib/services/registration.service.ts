import { prisma } from "@/lib/db/prisma";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "@/lib/utils/errors";
import { RegisterForHackathonInput } from "@/lib/validators/registration.schema";
import {
  RegistrationStatus,
  HackathonStatus,
  UserRole,
  NotificationType,
  Prisma,
} from "@prisma/client";
import { SessionUser } from "@/types";
import { logger } from "@/lib/utils/logger";

export class RegistrationService {
  /**
   * Register a participant for a hackathon.
   */
  static async registerParticipant(
    hackathonIdOrSlug: string,
    user: SessionUser,
    input: RegisterForHackathonInput
  ) {
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: hackathonIdOrSlug }, { slug: hackathonIdOrSlug }],
      },
      include: { campus: true },
    });

    if (!hackathon) {
      throw new NotFoundError("Hackathon", hackathonIdOrSlug);
    }

    // Status check
    if (
      hackathon.status !== HackathonStatus.REGISTRATION_OPEN &&
      hackathon.status !== HackathonStatus.IN_PROGRESS
    ) {
      throw new ValidationError(
        `Registrations are not currently open for this hackathon (Current status: ${hackathon.status.replace("_", " ")}).`
      );
    }

    // Deadline check
    if (hackathon.registrationEnd && new Date() > new Date(hackathon.registrationEnd)) {
      throw new ValidationError("The registration deadline for this hackathon has passed.");
    }

    // Check duplicate registration
    const existingRegistration = await prisma.registration.findUnique({
      where: {
        userId_hackathonId: {
          userId: user.id,
          hackathonId: hackathon.id,
        },
      },
    });

    if (existingRegistration) {
      throw new ConflictError("You are already registered for this hackathon.");
    }

    // Campus eligibility check (if not inter-campus and user has a campus assigned)
    if (
      !hackathon.isInterCampus &&
      hackathon.campusId &&
      user.campusId &&
      user.campusId !== hackathon.campusId
    ) {
      throw new ForbiddenError(
        `This hackathon is exclusive to ${hackathon.campus?.name || "another campus"}.`
      );
    }

    const registration = await prisma.$transaction(async (tx) => {
      const created = await tx.registration.create({
        data: {
          userId: user.id,
          hackathonId: hackathon.id,
          status: RegistrationStatus.APPROVED, // Default approved for verified students
          customFields: input.customFields as Prisma.InputJsonValue,
        },
        include: {
          hackathon: {
            select: { id: true, title: true, slug: true },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Notification
      await tx.notification.create({
        data: {
          userId: user.id,
          title: "Registration Confirmed! 🎉",
          message: `You are officially registered for ${hackathon.title}. You can now create or join a team!`,
          type: NotificationType.SYSTEM,
          link: `/hackathons/${hackathon.slug}/teams`,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "PARTICIPANT_REGISTERED",
          entity: "Registration",
          entityId: created.id,
          newValue: { hackathonId: hackathon.id, status: created.status },
        },
      });

      return created;
    });

    logger.info("Participant registered", {
      registrationId: registration.id,
      hackathonId: hackathon.id,
      userId: user.id,
    });

    return registration;
  }

  /**
   * Get registration for a specific user and hackathon.
   */
  static async getUserRegistration(hackathonIdOrSlug: string, userId: string) {
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: hackathonIdOrSlug }, { slug: hackathonIdOrSlug }],
      },
      select: { id: true },
    });

    if (!hackathon) {
      return null;
    }

    return prisma.registration.findUnique({
      where: {
        userId_hackathonId: {
          userId,
          hackathonId: hackathon.id,
        },
      },
      include: {
        hackathon: {
          select: { id: true, title: true, slug: true, status: true },
        },
      },
    });
  }

  /**
   * List all registrations for a hackathon (Admin view).
   */
  static async listRegistrations(
    hackathonIdOrSlug: string,
    user: SessionUser,
    statusFilter?: RegistrationStatus,
    pagination = { skip: 0, take: 20 }
  ) {
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: hackathonIdOrSlug }, { slug: hackathonIdOrSlug }],
      },
    });

    if (!hackathon) {
      throw new NotFoundError("Hackathon", hackathonIdOrSlug);
    }

    // Scoping check for campus admins
    if (user.role === UserRole.CAMPUS_ADMIN && hackathon.campusId !== user.campusId) {
      throw new ForbiddenError("Unauthorized to view registrations for this campus.");
    }

    const where: Prisma.RegistrationWhereInput = {
      hackathonId: hackathon.id,
      ...(statusFilter ? { status: statusFilter } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.registration.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
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
                  skills: true,
                  github: true,
                },
              },
            },
          },
        },
        orderBy: { registeredAt: "desc" },
      }),
      prisma.registration.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Update registration status (Approve, Waitlist, Reject) with student notification.
   */
  static async updateRegistrationStatus(
    registrationId: string,
    user: SessionUser,
    newStatus: RegistrationStatus,
    reason?: string
  ) {
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        hackathon: true,
        user: true,
      },
    });

    if (!registration) {
      throw new NotFoundError("Registration", registrationId);
    }

    if (
      user.role === UserRole.CAMPUS_ADMIN &&
      registration.hackathon.campusId !== user.campusId
    ) {
      throw new ForbiddenError("Unauthorized to manage registrations for this campus.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.registration.update({
        where: { id: registrationId },
        data: { status: newStatus },
      });

      // Notification to student
      await tx.notification.create({
        data: {
          userId: registration.userId,
          title: `Registration Status Update: ${newStatus}`,
          message:
            newStatus === RegistrationStatus.APPROVED
              ? `Your registration for ${registration.hackathon.title} is APPROVED!`
              : `Your registration status for ${registration.hackathon.title} has been updated to ${newStatus}.${reason ? ` Reason: ${reason}` : ""}`,
          type: NotificationType.SYSTEM,
          link: `/hackathons/${registration.hackathon.slug}`,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "REGISTRATION_STATUS_UPDATED",
          entity: "Registration",
          entityId: registrationId,
          oldValue: { status: registration.status },
          newValue: { status: newStatus, reason: reason || null },
        },
      });

      return res;
    });

    return updated;
  }

  /**
   * Export all participant registrations as a CSV string.
   */
  static async exportRegistrationsCsv(hackathonIdOrSlug: string, user: SessionUser): Promise<string> {
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: hackathonIdOrSlug }, { slug: hackathonIdOrSlug }],
      },
    });

    if (!hackathon) {
      throw new NotFoundError("Hackathon", hackathonIdOrSlug);
    }

    if (user.role === UserRole.CAMPUS_ADMIN && hackathon.campusId !== user.campusId) {
      throw new ForbiddenError("Unauthorized to export registrations for this campus.");
    }

    const registrations = await prisma.registration.findMany({
      where: { hackathonId: hackathon.id },
      include: {
        user: {
          include: {
            campus: true,
            profile: true,
          },
        },
      },
      orderBy: { registeredAt: "asc" },
    });

    const headers = [
      "Registration ID",
      "Student Name",
      "Email",
      "Campus",
      "Enrollment Number",
      "Branch",
      "Year",
      "Skills",
      "Status",
      "Registered At",
    ];

    const rows = registrations.map((r) => [
      `"${r.id}"`,
      `"${r.user.name.replace(/"/g, '""')}"`,
      `"${r.user.email}"`,
      `"${r.user.campus?.name || "N/A"}"`,
      `"${r.user.profile?.enrollmentNo || "N/A"}"`,
      `"${r.user.profile?.branch || "N/A"}"`,
      `"${r.user.profile?.year || "N/A"}"`,
      `"${(r.user.profile?.skills || "").replace(/"/g, '""')}"`,
      `"${r.status}"`,
      `"${new Date(r.registeredAt).toISOString()}"`,
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }
}
