/**
 * Application-wide constants.
 */

/** Application metadata */
export const APP = {
  name: process.env.APP_NAME ?? "JECRC Hackathon Platform",
  url: process.env.APP_URL ?? "http://localhost:3000",
} as const;

/** Pagination defaults */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

/** File upload limits */
export const UPLOAD = {
  MAX_SIZE_BYTES: (parseInt(process.env.MAX_FILE_SIZE_MB ?? "10", 10)) * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
  ALLOWED_DOCUMENT_TYPES: ["application/pdf"],
} as const;

/** Password requirements */
export const PASSWORD = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  BCRYPT_ROUNDS: 12,
} as const;

/** Hackathon status transition rules */
export const HACKATHON_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["REGISTRATION_OPEN"],
  REGISTRATION_OPEN: ["IN_PROGRESS", "DRAFT"],
  IN_PROGRESS: ["SUBMISSION_OPEN"],
  SUBMISSION_OPEN: ["EVALUATION"],
  EVALUATION: ["RESULTS_PUBLISHED"],
  RESULTS_PUBLISHED: ["ARCHIVED"],
  ARCHIVED: [], // Terminal state
} as const;

/** Team invite expiry (7 days) */
export const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/** Supported repo providers */
export const REPO_PROVIDERS = ["GITHUB", "GITLAB"] as const;
