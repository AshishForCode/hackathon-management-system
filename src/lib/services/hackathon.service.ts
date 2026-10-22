import { prisma } from "@/lib/db/prisma";
import { ConflictError, NotFoundError, ValidationError, ForbiddenError } from "@/lib/utils/errors";
import { CreateHackathonInput, UpdateHackathonInput } from "@/lib/validators/hackathon.schema";
import { HackathonStatus, HackathonMode, UserRole, Prisma, SponsorTier } from "@prisma/client";
import { HACKATHON_STATUS_TRANSITIONS } from "@/lib/utils/constants";
import { SessionUser } from "@/types";
import { logger } from "@/lib/utils/logger";

export interface HackathonFilters {
  status?: HackathonStatus;
  campusId?: string;
  mode?: HackathonMode;
  search?: string;
  isInterCampus?: boolean;
}

export class HackathonService {
  /**
   * Create a new hackathon.
   * Scoped to Super Admin (any campus) or Campus Admin (their campus only).
   */
  static async createHackathon(user: SessionUser, input: CreateHackathonInput) {
    // Campus scoping check
    if (user.role === UserRole.CAMPUS_ADMIN) {
      if (input.campusId && input.campusId !== user.campusId) {
        throw new ForbiddenError("Campus Admins can only create hackathons for their own campus.");
      }
      // Force campusId to Campus Admin's assigned campus if not provided
      input.campusId = user.campusId;
    }

    // Slug uniqueness check
    const existingSlug = await prisma.hackathon.findUnique({
      where: { slug: input.slug.toLowerCase().trim() },
    });

    if (existingSlug) {
      throw new ConflictError(`A hackathon with the slug '${input.slug}' already exists.`);
    }

    const { tracks, faqs, ...hackathonData } = input;

    const hackathon = await prisma.$transaction(async (tx) => {
      const created = await tx.hackathon.create({
        data: {
          ...hackathonData,
          slug: hackathonData.slug.toLowerCase().trim(),
          status: HackathonStatus.DRAFT,
          createdById: user.id,
          tracks: tracks && tracks.length > 0
            ? {
                create: tracks.map((t) => ({
                  name: t.name.trim(),
                  description: t.description?.trim() || null,
                  maxTeams: t.maxTeams || null,
                })),
              }
            : undefined,
          faqs: faqs && faqs.length > 0
            ? {
                create: faqs.map((f, index) => ({
                  question: f.question.trim(),
                  answer: f.answer.trim(),
                  sortOrder: f.sortOrder ?? index + 1,
                })),
              }
            : undefined,
        },
        include: {
          campus: true,
          tracks: true,
          faqs: true,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "HACKATHON_CREATED",
          entity: "Hackathon",
          entityId: created.id,
          newValue: { title: created.title, slug: created.slug, campusId: created.campusId },
        },
      });

      return created;
    });

    logger.info("Hackathon created successfully", { id: hackathon.id, slug: hackathon.slug });
    return hackathon;
  }

  /**
   * Update hackathon details.
   */
  static async updateHackathon(id: string, user: SessionUser, input: UpdateHackathonInput) {
    const existing = await prisma.hackathon.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Hackathon", id);
    }

    // Enforce campus scoping
    if (user.role === UserRole.CAMPUS_ADMIN && existing.campusId !== user.campusId) {
      throw new ForbiddenError("You can only modify hackathons belonging to your assigned campus.");
    }

    // If updating slug, check uniqueness
    if (input.slug && input.slug.toLowerCase().trim() !== existing.slug) {
      const slugExists = await prisma.hackathon.findUnique({
        where: { slug: input.slug.toLowerCase().trim() },
      });
      if (slugExists) {
        throw new ConflictError(`Slug '${input.slug}' is already in use.`);
      }
    }

    const { tracks, faqs, ...fields } = input;
    void tracks;
    void faqs;

    const dataToUpdate: Prisma.HackathonUncheckedUpdateInput = {
      ...fields,
      slug: fields.slug ? fields.slug.toLowerCase().trim() : undefined,
    };

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.hackathon.update({
        where: { id },
        data: dataToUpdate,
        include: {
          campus: true,
          tracks: true,
          faqs: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "HACKATHON_UPDATED",
          entity: "Hackathon",
          entityId: id,
          oldValue: { title: existing.title, slug: existing.slug },
          newValue: { title: result.title, slug: result.slug },
        },
      });

      return result;
    });

    return updated;
  }

  /**
   * Transition hackathon status with lifecycle state machine validation.
   * State Machine: DRAFT → REGISTRATION_OPEN → IN_PROGRESS → SUBMISSION_OPEN → EVALUATION → RESULTS_PUBLISHED → ARCHIVED
   */
  static async updateStatus(id: string, user: SessionUser, newStatus: HackathonStatus) {
    const existing = await prisma.hackathon.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Hackathon", id);
    }

    // Scoping check
    if (user.role === UserRole.CAMPUS_ADMIN && existing.campusId !== user.campusId) {
      throw new ForbiddenError("You can only update hackathons belonging to your assigned campus.");
    }

    const allowedNextStatuses = HACKATHON_STATUS_TRANSITIONS[existing.status] || [];
    if (!allowedNextStatuses.includes(newStatus)) {
      throw new ValidationError(
        `Invalid status transition from '${existing.status}' to '${newStatus}'. Allowed transitions: ${allowedNextStatuses.join(", ") || "None (Terminal state)"}`
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.hackathon.update({
        where: { id },
        data: { status: newStatus },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "HACKATHON_STATUS_CHANGE",
          entity: "Hackathon",
          entityId: id,
          oldValue: { status: existing.status },
          newValue: { status: newStatus },
        },
      });

      return res;
    });

    logger.info("Hackathon status changed", { id, oldStatus: existing.status, newStatus });
    return updated;
  }

  /**
   * List hackathons with filtering, search, and pagination.
   */
  static async listHackathons(
    filters: HackathonFilters = {},
    pagination: { skip: number; take: number }
  ) {
    const where: Prisma.HackathonWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.campusId) {
      where.OR = [
        { campusId: filters.campusId },
        { isInterCampus: true },
      ];
    }

    if (filters.mode) {
      where.mode = filters.mode;
    }

    if (filters.isInterCampus !== undefined) {
      where.isInterCampus = filters.isInterCampus;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.hackathon.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        include: {
          campus: true,
          tracks: true,
          _count: {
            select: {
              registrations: true,
              teams: true,
              submissions: true,
            },
          },
        },
        orderBy: { startDate: "desc" },
      }),
      prisma.hackathon.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Get hackathon by slug or ID with all associated tracks, sponsors, FAQs, and counts.
   */
  static async getHackathonByIdOrSlug(identifier: string) {
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
      },
      include: {
        campus: true,
        tracks: true,
        faqs: { orderBy: { sortOrder: "asc" } },
        sponsors: { orderBy: { tier: "asc" } },
        rubrics: {
          include: { criteria: { orderBy: { sortOrder: "asc" } } },
        },
        _count: {
          select: {
            registrations: true,
            teams: true,
            submissions: true,
          },
        },
      },
    });

    if (!hackathon) {
      throw new NotFoundError("Hackathon", identifier);
    }

    return hackathon;
  }

  /**
   * Add a track to an existing hackathon.
   */
  static async addTrack(hackathonId: string, user: SessionUser, data: { name: string; description?: string; maxTeams?: number | null }) {
    const hackathon = await prisma.hackathon.findUnique({ where: { id: hackathonId } });
    if (!hackathon) throw new NotFoundError("Hackathon", hackathonId);

    if (user.role === UserRole.CAMPUS_ADMIN && hackathon.campusId !== user.campusId) {
      throw new ForbiddenError("Unauthorized to modify tracks for this campus.");
    }

    return prisma.track.create({
      data: {
        hackathonId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        maxTeams: data.maxTeams || null,
      },
    });
  }

  /**
   * Add a sponsor to an existing hackathon.
   */
  static async addSponsor(hackathonId: string, user: SessionUser, data: { name: string; logoUrl?: string | null; website?: string | null; tier?: SponsorTier }) {
    const hackathon = await prisma.hackathon.findUnique({ where: { id: hackathonId } });
    if (!hackathon) throw new NotFoundError("Hackathon", hackathonId);

    if (user.role === UserRole.CAMPUS_ADMIN && hackathon.campusId !== user.campusId) {
      throw new ForbiddenError("Unauthorized to modify sponsors for this campus.");
    }

    return prisma.hackathonSponsor.create({
      data: {
        hackathonId,
        name: data.name.trim(),
        logoUrl: data.logoUrl || null,
        website: data.website || null,
        tier: data.tier || "PARTNER",
      },
    });
  }

  /**
   * Add a FAQ to an existing hackathon.
   */
  static async addFaq(hackathonId: string, user: SessionUser, data: { question: string; answer: string; sortOrder?: number }) {
    const hackathon = await prisma.hackathon.findUnique({ where: { id: hackathonId } });
    if (!hackathon) throw new NotFoundError("Hackathon", hackathonId);

    if (user.role === UserRole.CAMPUS_ADMIN && hackathon.campusId !== user.campusId) {
      throw new ForbiddenError("Unauthorized to modify FAQs for this campus.");
    }

    return prisma.hackathonFAQ.create({
      data: {
        hackathonId,
        question: data.question.trim(),
        answer: data.answer.trim(),
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }
}
