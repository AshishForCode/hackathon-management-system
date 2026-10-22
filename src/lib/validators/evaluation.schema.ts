import { z } from "zod";
import { EvaluationRound } from "@prisma/client";

export const criterionInputSchema = z.object({
  name: z.string().min(2, "Criterion name is required").max(60),
  description: z.string().optional().nullable(),
  weight: z.number().min(0.1).max(10).default(1.0),
  maxScore: z.number().int().min(1).max(100).default(10),
  sortOrder: z.number().int().default(0),
});

export const createRubricSchema = z.object({
  name: z.string().min(3).max(80),
  round: z.nativeEnum(EvaluationRound).default(EvaluationRound.FINAL),
  criteria: z
    .array(criterionInputSchema)
    .min(1, "A rubric must contain at least one criterion"),
});

export type CreateRubricInput = z.infer<typeof createRubricSchema>;

export const scoreInputSchema = z.object({
  criterionId: z.string(),
  score: z.number().min(0, "Score cannot be negative"),
  comment: z.string().optional().nullable(),
});

export const submitEvaluationSchema = z.object({
  rubricId: z.string().optional(),
  round: z.nativeEnum(EvaluationRound).default(EvaluationRound.FINAL),
  scores: z
    .array(scoreInputSchema)
    .min(1, "At least one criterion score must be submitted"),
  comments: z.string().optional().nullable(),
  isLocked: z.boolean().default(false),
});

export type SubmitEvaluationInput = z.infer<typeof submitEvaluationSchema>;

export const mentorFeedbackSchema = z.object({
  feedback: z
    .string()
    .min(10, "Mentor feedback must be at least 10 characters")
    .max(5000),
});

export type MentorFeedbackInput = z.infer<typeof mentorFeedbackSchema>;
