import { z } from "zod";
import { RegistrationStatus } from "@prisma/client";

export const registerForHackathonSchema = z.object({
  customFields: z.record(z.string(), z.any()).optional().default({}),
  trackId: z.string().optional().nullable(),
});

export type RegisterForHackathonInput = z.infer<typeof registerForHackathonSchema>;

export const updateRegistrationStatusSchema = z.object({
  status: z.nativeEnum(RegistrationStatus),
  reason: z.string().optional(),
});

export type UpdateRegistrationStatusInput = z.infer<typeof updateRegistrationStatusSchema>;
