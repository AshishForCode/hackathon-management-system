import { z } from "zod";

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(2, "Team name must be at least 2 characters")
    .max(50, "Team name cannot exceed 50 characters")
    .regex(/^[a-zA-Z0-9 _-]+$/, "Team name can only contain letters, numbers, spaces, underscores, and hyphens"),
  lookingForMembers: z.boolean().default(false),
  requiredSkills: z.string().optional().nullable(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const joinTeamSchema = z.object({
  inviteCode: z.string().min(4, "Invalid invite code format").trim(),
});

export type JoinTeamInput = z.infer<typeof joinTeamSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().email("Valid student email required").trim().toLowerCase(),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const respondInviteSchema = z.object({
  accept: z.boolean(),
});

export type RespondInviteInput = z.infer<typeof respondInviteSchema>;

export const updateTeamSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-zA-Z0-9 _-]+$/)
    .optional(),
  lookingForMembers: z.boolean().optional(),
  requiredSkills: z.string().optional().nullable(),
  locked: z.boolean().optional(),
});

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
