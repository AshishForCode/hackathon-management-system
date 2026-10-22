import { auth } from "./auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/utils/errors";
import { hasPermission, Permission, isAdminRole } from "./rbac";
import { UserRole, UserStatus } from "@prisma/client";
import { SessionUser } from "@/types";

/**
 * Get current session user without throwing an error if unauthenticated.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  return session.user as SessionUser;
}

/**
 * Require an authenticated user. Throws UnauthorizedError (401) if not logged in.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError("You must be signed in to perform this action");
  }

  if (user.status === UserStatus.SUSPENDED) {
    throw new ForbiddenError("Your account has been suspended. Please contact the hackathon administrator.");
  }

  return user;
}

/**
 * Require a specific granular permission defined in the RBAC matrix.
 * Throws ForbiddenError (403) if the user's role lacks the capability.
 */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireAuth();

  if (!hasPermission(user.role, permission)) {
    throw new ForbiddenError(`Permission denied: Action requires '${permission}' permission.`);
  }

  return user;
}

/**
 * Require an admin-tier role (SUPER_ADMIN, CAMPUS_ADMIN, or ORGANIZER).
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();

  if (!isAdminRole(user.role)) {
    throw new ForbiddenError("Access restricted to platform administrators.");
  }

  return user;
}

/**
 * Verify campus access.
 * Super Admins can manage any campus.
 * Campus Admins can only manage their assigned campus.
 */
export async function requireCampusAccess(targetCampusId?: string | null): Promise<SessionUser> {
  const user = await requireAuth();

  if (user.role === UserRole.SUPER_ADMIN) {
    return user;
  }

  if (user.role === UserRole.CAMPUS_ADMIN) {
    if (!targetCampusId || user.campusId === targetCampusId) {
      return user;
    }
    throw new ForbiddenError("You are only authorized to manage hackathons for your assigned campus.");
  }

  throw new ForbiddenError("Administrative privileges required for campus scoping.");
}
