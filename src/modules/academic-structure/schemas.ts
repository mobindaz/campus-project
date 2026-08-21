import { z } from "zod";

export const academicPeriodPatternSchema = z.enum([
  "SEMESTER",
  "YEAR",
  "TERM",
  "TRIMESTER",
  "CUSTOM",
]);

export const createAcademicPeriodSchema = z.object({
  name: z
    .string()
    .min(1, "Period name is required")
    .max(100, "Period name must not exceed 100 characters"),
  code: z
    .string()
    .min(1, "Period code is required")
    .max(20, "Period code must not exceed 20 characters")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Code can only contain letters, numbers, underscores, and hyphens"
    ),
  pattern: academicPeriodPatternSchema,
  orderIndex: z.number().int().min(1),
  programId: z.string().min(1, "Program ID is required"),
  isActive: z.boolean(),
});

export const updateAcademicPeriodSchema = createAcademicPeriodSchema.partial();

export const generatePeriodsSchema = z.object({
  programId: z.string().min(1, "Program ID is required"),
  pattern: academicPeriodPatternSchema,
  count: z
    .number()
    .int("Count must be a whole number")
    .min(1, "Must generate at least 1 period")
    .max(20, "Cannot generate more than 20 periods at once"),
});

export const reorderAcademicPeriodsSchema = z.object({
  programId: z.string().min(1, "Program ID is required"),
  orderedIds: z.array(z.string()).min(1, "Ordered ID list is required"),
});

export const createBatchSchema = z.object({
  name: z
    .string()
    .min(2, "Batch name must be at least 2 characters")
    .max(100, "Batch name must not exceed 100 characters"),
  code: z
    .string()
    .min(2, "Batch code must be at least 2 characters")
    .max(30, "Batch code must not exceed 30 characters")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Code can only contain letters, numbers, underscores, and hyphens"
    ),
  academicYear: z
    .string()
    .min(4, "Academic year must be specified (e.g., 2024-2028)")
    .max(20, "Academic year string is too long"),
  admissionYear: z
    .number()
    .int()
    .min(1900, "Invalid admission year")
    .max(2100, "Invalid admission year"),
  graduationYear: z
    .number()
    .int()
    .min(1900, "Invalid graduation year")
    .max(2100, "Invalid graduation year"),
  section: z.string().max(10, "Section cannot exceed 10 characters").optional(),
  programId: z.string().min(1, "Program selection is required"),
  isActive: z.boolean(),
});

export const updateBatchSchema = createBatchSchema.partial();

export const batchFilterSchema = z.object({
  programId: z.string().optional(),
  includeInactive: z.boolean().optional(),
  search: z.string().optional(),
});

export type CreateAcademicPeriodInput = z.infer<
  typeof createAcademicPeriodSchema
>;
export type UpdateAcademicPeriodInput = z.infer<
  typeof updateAcademicPeriodSchema
>;
export type GeneratePeriodsInput = z.infer<typeof generatePeriodsSchema>;
export type ReorderAcademicPeriodsInput = z.infer<
  typeof reorderAcademicPeriodsSchema
>;

export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;
export type BatchFilterInput = z.infer<typeof batchFilterSchema>;

export const generateAcademicPeriodsPreviewSchema = z.object({
  durationYears: z
    .number()
    .int()
    .min(1, "Duration must be at least 1 year")
    .max(10, "Duration cannot exceed 10 years"),
  pattern: z.enum(["SEMESTER", "YEAR"]),
  programId: z.string().optional(),
  departmentId: z.string().optional().nullable(),
});

export const setupWizardSubmitSchema = z.object({
  program: z.object({
    name: z
      .string()
      .min(2, "Program name must be at least 2 characters")
      .max(100),
    code: z
      .string()
      .min(2, "Program code must be at least 2 characters")
      .max(20),
    shortName: z
      .string()
      .min(2, "Short name must be at least 2 characters")
      .max(50),
    type: z.enum([
      "DEGREE",
      "DIPLOMA",
      "POST_GRADUATE",
      "CERTIFICATE",
      "DOCTORAL",
    ]),
    durationYears: z.number().int().min(1).max(10),
  }),
  departments: z
    .array(
      z.object({
        name: z
          .string()
          .min(2, "Department name must be at least 2 characters")
          .max(100),
        code: z
          .string()
          .min(2, "Department code must be at least 2 characters")
          .max(20),
        description: z.string().optional(),
      })
    )
    .optional(),
  periodPattern: z.enum(["SEMESTER", "YEAR"]),
});

export type GenerateAcademicPeriodsPreviewInput = z.infer<
  typeof generateAcademicPeriodsPreviewSchema
>;
export type SetupWizardSubmitInput = z.infer<typeof setupWizardSubmitSchema>;
