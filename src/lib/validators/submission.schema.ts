import { z } from "zod";
import { RepoProvider } from "@prisma/client";

export const submissionInputSchema = z.object({
  title: z
    .string()
    .min(3, "Project title must be at least 3 characters")
    .max(120, "Project title cannot exceed 120 characters"),
  description: z
    .string()
    .min(20, "Please provide a detailed description (at least 20 characters)")
    .max(10000, "Description is too long (maximum 10,000 characters)"),
  trackId: z.string().optional().nullable(),
  techStack: z
    .string()
    .min(2, "Please list at least one technology (e.g. Next.js, Python, TensorFlow)")
    .max(255),
  demoVideoUrl: z
    .string()
    .url("Please provide a valid demo video URL (YouTube, Loom, Google Drive)")
    .optional()
    .nullable()
    .or(z.literal("")),
  presentationUrl: z
    .string()
    .url("Please provide a valid presentation or pitch deck URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  repoUrl: z
    .string()
    .url("Please provide a valid Git repository URL")
    .regex(
      /^(https?:\/\/)?(www\.)?(github\.com|gitlab\.com)\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\/)?$/,
      "Repository URL must be a valid GitHub or GitLab repository link"
    ),
  repoProvider: z.nativeEnum(RepoProvider).default(RepoProvider.GITHUB),
});

export type SubmissionInput = z.infer<typeof submissionInputSchema>;

export const updateSubmissionSchema = submissionInputSchema.partial();
export type UpdateSubmissionInput = z.infer<typeof updateSubmissionSchema>;

export const syncRepoSchema = z.object({
  repoUrl: z.string().url().optional(),
});
export type SyncRepoInput = z.infer<typeof syncRepoSchema>;
