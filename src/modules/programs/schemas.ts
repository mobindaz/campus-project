import { z } from "zod";

export const programTypeSchema = z.enum([
  "DEGREE",
  "DIPLOMA",
  "POST_GRADUATE",
  "CERTIFICATE",
  "DOCTORAL",
]);

export const createProgramSchema = z.object({
  name: z
    .string()
    .min(2, "Program name must be at least 2 characters")
    .max(100, "Program name must not exceed 100 characters"),
  code: z
    .string()
    .min(2, "Program code must be at least 2 characters")
    .max(20, "Program code must not exceed 20 characters")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Code can only contain letters, numbers, underscores, and hyphens"
    ),
  shortName: z
    .string()
    .min(2, "Short name must be at least 2 characters")
    .max(50, "Short name must not exceed 50 characters"),
  type: programTypeSchema,
  durationYears: z
    .number()
    .int("Duration in years must be a whole number")
    .min(1, "Duration must be at least 1 year")
    .max(10, "Duration cannot exceed 10 years"),
  isActive: z.boolean(),
  customFields: z.record(z.string(), z.any()).optional(),
});

export const updateProgramSchema = createProgramSchema.partial();

export const programFilterSchema = z.object({
  type: programTypeSchema.optional(),
  includeInactive: z.boolean().optional(),
  search: z.string().optional(),
});

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;
export type ProgramFilterInput = z.infer<typeof programFilterSchema>;
