import { z } from "zod";

export const departmentTypeSchema = z.enum(["ACADEMIC", "ADMINISTRATIVE"]);

export const createDepartmentSchema = z.object({
  name: z
    .string()
    .min(2, "Department name must be at least 2 characters")
    .max(100, "Department name must not exceed 100 characters"),
  code: z
    .string()
    .min(2, "Department code must be at least 2 characters")
    .max(20, "Department code must not exceed 20 characters")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Code can only contain letters, numbers, underscores, and hyphens"
    ),
  type: departmentTypeSchema,
  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .optional(),
  programId: z.string().optional().nullable(),
  isActive: z.boolean(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export const departmentFilterSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
  search: z.string().optional(),
  type: departmentTypeSchema.optional(),
  programId: z.string().optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type DepartmentFilterInput = z.infer<typeof departmentFilterSchema>;
