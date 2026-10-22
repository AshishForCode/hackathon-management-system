import { z } from "zod";
import { HackathonMode, HackathonStatus, SponsorTier } from "@prisma/client";

export const trackInputSchema = z.object({
  name: z.string().min(2, "Track name is required"),
  description: z.string().optional(),
  maxTeams: z.number().int().positive().optional().nullable(),
});

export const sponsorInputSchema = z.object({
  name: z.string().min(2, "Sponsor name is required"),
  logoUrl: z.string().url().optional().or(z.literal("")).nullable(),
  website: z.string().url().optional().or(z.literal("")).nullable(),
  tier: z.nativeEnum(SponsorTier).default(SponsorTier.PARTNER),
});

export const faqInputSchema = z.object({
  question: z.string().min(3, "Question is required"),
  answer: z.string().min(3, "Answer is required"),
  sortOrder: z.number().int().default(0),
});

export const hackathonBaseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(120),
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  mode: z.nativeEnum(HackathonMode).default(HackathonMode.HYBRID),
  campusId: z.string().optional().nullable(),
  isInterCampus: z.boolean().default(false),
  registrationStart: z.coerce.date(),
  registrationEnd: z.coerce.date(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  submissionDeadline: z.coerce.date(),
  minTeamSize: z.number().int().min(1).default(1),
  maxTeamSize: z.number().int().min(1).max(10).default(5),
  venue: z.string().optional().nullable(),
  rules: z.string().optional().nullable(),
  eligibility: z.string().optional().nullable(),
  prizes: z.string().optional().nullable(),
  bannerImage: z.string().url().optional().or(z.literal("")).nullable(),
  website: z.string().url().optional().or(z.literal("")).nullable(),
  tracks: z.array(trackInputSchema).optional(),
  faqs: z.array(faqInputSchema).optional(),
});

export const createHackathonSchema = hackathonBaseSchema
  .refine((data) => data.minTeamSize <= data.maxTeamSize, {
    message: "Minimum team size cannot exceed maximum team size",
    path: ["minTeamSize"],
  })
  .refine((data) => data.registrationStart <= data.registrationEnd, {
    message: "Registration start must be before registration end",
    path: ["registrationEnd"],
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "Hackathon start date must be before end date",
    path: ["endDate"],
  });

export type CreateHackathonInput = z.infer<typeof createHackathonSchema>;

export const updateHackathonSchema = hackathonBaseSchema.partial();
export type UpdateHackathonInput = z.infer<typeof updateHackathonSchema>;

export const updateHackathonStatusSchema = z.object({
  status: z.nativeEnum(HackathonStatus),
});
export type UpdateHackathonStatusInput = z.infer<typeof updateHackathonStatusSchema>;
