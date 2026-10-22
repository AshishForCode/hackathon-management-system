import { prisma } from "@/lib/db/prisma";
import { hash } from "bcryptjs";
import { ConflictError, NotFoundError } from "@/lib/utils/errors";
import { RegisterInput, ProfileUpdateInput } from "@/lib/validators/auth.schema";
import { UserRole, UserStatus } from "@prisma/client";
import { PASSWORD } from "@/lib/utils/constants";
import { logger } from "@/lib/utils/logger";

export class UserService {
  /**
   * Register a new student participant account with profile.
   */
  static async registerUser(input: RegisterInput) {
    const emailNormalized = input.email.toLowerCase().trim();

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email: emailNormalized },
    });

    if (existingUser) {
      throw new ConflictError("An account with this email address already exists.");
    }

    // Check enrollment uniqueness
    const existingEnrollment = await prisma.profile.findUnique({
      where: { enrollmentNo: input.enrollmentNo.trim() },
    });

    if (existingEnrollment) {
      throw new ConflictError("An account with this enrollment number already exists.");
    }

    // Verify selected campus exists
    const campus = await prisma.campus.findUnique({
      where: { id: input.campusId },
    });

    if (!campus) {
      throw new NotFoundError("Selected campus does not exist.");
    }

    // Hash password
    const passwordHash = await hash(input.password, PASSWORD.BCRYPT_ROUNDS);

    // Create user and profile in an atomic transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: emailNormalized,
          name: input.name.trim(),
          passwordHash,
          role: UserRole.PARTICIPANT,
          status: UserStatus.ACTIVE,
          emailVerified: new Date(), // Auto-verified for college emails in Phase 1
          campusId: input.campusId,
          profile: {
            create: {
              enrollmentNo: input.enrollmentNo.trim().toUpperCase(),
              branch: input.branch.trim(),
              year: input.year,
              skills: input.skills?.trim() || null,
              github: input.github?.trim() || null,
              linkedin: input.linkedin?.trim() || null,
            },
          },
        },
        include: {
          profile: true,
          campus: true,
        },
      });

      // Audit registration
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "USER_SIGNUP",
          entity: "User",
          entityId: user.id,
          newValue: { email: user.email, role: user.role, campus: campus.name },
        },
      });

      return user;
    });

    logger.info("New user registered successfully", { userId: newUser.id, email: newUser.email });

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      campus: newUser.campus,
      profile: newUser.profile,
    };
  }

  /**
   * Get user profile by ID with campus and activity counts.
   */
  static async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        campus: true,
        _count: {
          select: {
            registrations: true,
            teamMemberships: true,
            certificates: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("User", userId);
    }

    const safeUser = { ...user };
    delete (safeUser as { passwordHash?: string | null }).passwordHash;
    return safeUser;
  }

  /**
   * Update student profile.
   */
  static async updateUserProfile(userId: string, input: ProfileUpdateInput) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!existing) {
      throw new NotFoundError("User", userId);
    }

    // If enrollment number is updated, check conflict
    if (input.enrollmentNo && input.enrollmentNo !== existing.profile?.enrollmentNo) {
      const duplicateEnrollment = await prisma.profile.findUnique({
        where: { enrollmentNo: input.enrollmentNo.trim() },
      });
      if (duplicateEnrollment) {
        throw new ConflictError("Enrollment number is already in use by another student.");
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Update User table fields if provided
      if (input.name || input.campusId) {
        await tx.user.update({
          where: { id: userId },
          data: {
            name: input.name ? input.name.trim() : undefined,
            campusId: input.campusId !== undefined ? input.campusId : undefined,
          },
        });
      }

      // Upsert Profile
      const profile = await tx.profile.upsert({
        where: { userId },
        create: {
          userId,
          enrollmentNo: input.enrollmentNo ? input.enrollmentNo.trim().toUpperCase() : null,
          branch: input.branch ? input.branch.trim() : null,
          year: input.year !== undefined ? input.year : null,
          skills: input.skills ? input.skills.trim() : null,
          github: input.github ? input.github.trim() : null,
          linkedin: input.linkedin ? input.linkedin.trim() : null,
          bio: input.bio ? input.bio.trim() : null,
          phone: input.phone ? input.phone.trim() : null,
        },
        update: {
          enrollmentNo: input.enrollmentNo !== undefined ? (input.enrollmentNo ? input.enrollmentNo.trim().toUpperCase() : null) : undefined,
          branch: input.branch !== undefined ? (input.branch ? input.branch.trim() : null) : undefined,
          year: input.year !== undefined ? input.year : undefined,
          skills: input.skills !== undefined ? (input.skills ? input.skills.trim() : null) : undefined,
          github: input.github !== undefined ? (input.github ? input.github.trim() : null) : undefined,
          linkedin: input.linkedin !== undefined ? (input.linkedin ? input.linkedin.trim() : null) : undefined,
          bio: input.bio !== undefined ? (input.bio ? input.bio.trim() : null) : undefined,
          phone: input.phone !== undefined ? (input.phone ? input.phone.trim() : null) : undefined,
        },
      });

      return profile;
    });

    return updated;
  }
}
