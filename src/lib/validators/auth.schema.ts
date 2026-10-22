import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please provide a valid college email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().min(2, "Full name must be at least 2 characters"),
    email: z
      .string()
      .email("Please provide a valid college email address")
      .refine((val) => {
        const allowedDomain = process.env.GOOGLE_ALLOWED_DOMAIN;
        if (allowedDomain && allowedDomain.trim() !== "") {
          // If domain restriction is configured, advise student email format
          return val.toLowerCase().endsWith(`@${allowedDomain.toLowerCase()}`) || val.includes("@");
        }
        return true;
      }, "Email must match campus student domain"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    campusId: z.string().min(1, "Please select your primary campus"),
    enrollmentNo: z.string().min(3, "Enrollment number is required"),
    branch: z.string().min(2, "Academic branch is required (e.g. CSE, IT, ECE)"),
    year: z.number().int().min(1).max(5, "Year must be between 1 and 5"),
    skills: z.string().optional(),
    github: z.string().optional(),
    linkedin: z.string().url("Please enter a valid LinkedIn URL").optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const profileUpdateSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters").optional(),
  campusId: z.string().optional().nullable(),
  enrollmentNo: z.string().min(3, "Enrollment number must be at least 3 characters").optional().nullable(),
  branch: z.string().optional().nullable(),
  year: z.number().int().min(1).max(5).optional().nullable(),
  skills: z.string().optional().nullable(),
  github: z.string().optional().nullable(),
  linkedin: z.string().url("Please enter a valid LinkedIn URL").optional().nullable().or(z.literal("")),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional().nullable(),
  phone: z.string().optional().nullable(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords do not match",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
