import { UserRole } from "@prisma/client";

/**
 * Role-Based Access Control (RBAC) system.
 *
 * Permissions are defined as "resource:action" strings.
 * Each role has a set of allowed permissions.
 * Server-side enforcement is mandatory — UI checks are only for UX.
 */

// ---- Permission Definitions ----

export type Permission =
  // Hackathon management
  | "hackathon:create"
  | "hackathon:read"
  | "hackathon:update"
  | "hackathon:delete"
  | "hackathon:manage_status"
  // Registration management
  | "registration:create"
  | "registration:read"
  | "registration:read_all"
  | "registration:approve"
  | "registration:export"
  // Team management
  | "team:create"
  | "team:read"
  | "team:update"
  | "team:delete"
  | "team:manage_members"
  // Submission management
  | "submission:create"
  | "submission:read"
  | "submission:read_all"
  | "submission:update"
  // Evaluation
  | "evaluation:read"
  | "evaluation:score"
  | "evaluation:manage_rubrics"
  | "evaluation:manage_jury"
  | "evaluation:manage_mentors"
  // Results
  | "result:read"
  | "result:publish"
  | "result:override"
  // User management
  | "user:read"
  | "user:read_all"
  | "user:update"
  | "user:manage_roles"
  | "user:suspend"
  // Campus management
  | "campus:read"
  | "campus:manage"
  // Notifications & certificates
  | "notification:send"
  | "certificate:generate"
  // Reports & dashboard
  | "report:read"
  | "dashboard:admin"
  | "dashboard:mentor"
  | "dashboard:jury"
  // Audit
  | "audit:read"
  // Announcements
  | "announcement:create"
  | "announcement:manage";

// ---- Role → Permission Mapping ----

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    // Super Admin has all permissions
    "hackathon:create", "hackathon:read", "hackathon:update", "hackathon:delete", "hackathon:manage_status",
    "registration:create", "registration:read", "registration:read_all", "registration:approve", "registration:export",
    "team:create", "team:read", "team:update", "team:delete", "team:manage_members",
    "submission:create", "submission:read", "submission:read_all", "submission:update",
    "evaluation:read", "evaluation:score", "evaluation:manage_rubrics", "evaluation:manage_jury", "evaluation:manage_mentors",
    "result:read", "result:publish", "result:override",
    "user:read", "user:read_all", "user:update", "user:manage_roles", "user:suspend",
    "campus:read", "campus:manage",
    "notification:send", "certificate:generate",
    "report:read", "dashboard:admin", "dashboard:mentor", "dashboard:jury",
    "audit:read",
    "announcement:create", "announcement:manage",
  ],

  CAMPUS_ADMIN: [
    "hackathon:create", "hackathon:read", "hackathon:update", "hackathon:manage_status",
    "registration:read", "registration:read_all", "registration:approve", "registration:export",
    "team:read", "team:update", "team:manage_members",
    "submission:read", "submission:read_all",
    "evaluation:read", "evaluation:manage_rubrics", "evaluation:manage_jury", "evaluation:manage_mentors",
    "result:read", "result:publish", "result:override",
    "user:read", "user:read_all", "user:update",
    "campus:read",
    "notification:send", "certificate:generate",
    "report:read", "dashboard:admin",
    "audit:read",
    "announcement:create", "announcement:manage",
  ],

  ORGANIZER: [
    "hackathon:read", "hackathon:update", "hackathon:manage_status",
    "registration:read", "registration:read_all", "registration:approve", "registration:export",
    "team:read", "team:update", "team:manage_members",
    "submission:read", "submission:read_all",
    "evaluation:read", "evaluation:manage_rubrics", "evaluation:manage_jury", "evaluation:manage_mentors",
    "result:read", "result:publish",
    "user:read",
    "campus:read",
    "notification:send", "certificate:generate",
    "report:read", "dashboard:admin",
    "announcement:create", "announcement:manage",
  ],

  PARTICIPANT: [
    "hackathon:read",
    "registration:create", "registration:read",
    "team:create", "team:read", "team:update", "team:manage_members",
    "submission:create", "submission:read", "submission:update",
    "result:read",
    "user:read", "user:update",
    "campus:read",
  ],

  MENTOR: [
    "hackathon:read",
    "team:read",
    "submission:read", "submission:read_all",
    "evaluation:read",
    "result:read",
    "user:read",
    "campus:read",
    "dashboard:mentor",
  ],

  JURY: [
    "hackathon:read",
    "submission:read", "submission:read_all",
    "evaluation:read", "evaluation:score",
    "result:read",
    "user:read",
    "campus:read",
    "dashboard:jury",
  ],

  GUEST: [
    "hackathon:read",
    "result:read",
    "campus:read",
  ],
};

// ---- Permission Check Functions ----

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has ALL of the specified permissions.
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check if a role has ANY of the specified permissions.
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Get all permissions for a role.
 */
export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Check if a role is an admin-level role (Super Admin, Campus Admin, or Organizer).
 */
export function isAdminRole(role: UserRole): boolean {
  const adminRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.CAMPUS_ADMIN, UserRole.ORGANIZER];
  return adminRoles.includes(role);
}

/**
 * Role hierarchy for comparison. Higher number = more privileged.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  GUEST: 0,
  PARTICIPANT: 1,
  MENTOR: 2,
  JURY: 2,
  ORGANIZER: 3,
  CAMPUS_ADMIN: 4,
  SUPER_ADMIN: 5,
};

/**
 * Check if roleA is at least as privileged as roleB.
 */
export function isAtLeast(roleA: UserRole, roleB: UserRole): boolean {
  return ROLE_HIERARCHY[roleA] >= ROLE_HIERARCHY[roleB];
}
