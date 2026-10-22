import { z } from "zod";
import { CertificateType } from "@prisma/client";

export const assignResultItemSchema = z.object({
  teamId: z.string(),
  rank: z.number().int().min(1),
  finalScore: z.number().min(0).max(100),
  award: z.string().optional().nullable(),
  isManualOverride: z.boolean().default(false),
  overrideReason: z.string().optional().nullable(),
});

export const assignResultsSchema = z.object({
  results: z.array(assignResultItemSchema).min(1),
  publish: z.boolean().default(true),
});

export type AssignResultsInput = z.infer<typeof assignResultsSchema>;

export const publishResultsSchema = z.object({
  published: z.boolean(),
});

export type PublishResultsInput = z.infer<typeof publishResultsSchema>;

export const generateCertificatesSchema = z.object({
  types: z
    .array(z.nativeEnum(CertificateType))
    .default([CertificateType.WINNER, CertificateType.RUNNER_UP, CertificateType.PARTICIPATION]),
});

export type GenerateCertificatesInput = z.infer<typeof generateCertificatesSchema>;
