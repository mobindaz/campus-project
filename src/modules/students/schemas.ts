import { z } from "zod";

export const createStudentSchema = z.object({
  registerNumber: z
    .string()
    .trim()
    .min(1, "Register Number cannot be empty")
    .max(50, "Register Number cannot exceed 50 characters"),
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .max(150, "Name cannot exceed 150 characters"),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  phone: z
    .string()
    .trim()
    .max(25, "Phone number cannot exceed 25 characters")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  dateOfBirth: z
    .union([z.string(), z.date()])
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }),
  programId: z.string().min(1, "Please select a Program"),
  departmentId: z
    .string()
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  batchId: z.string().min(1, "Please select an Admission Batch"),
  academicPeriodId: z
    .string()
    .min(1, "Please select an Academic Period / Semester"),
  isActive: z.boolean().optional().default(true),
  customFields: z.record(z.string(), z.any()).optional().default({}),
});

export type CreateStudentInput = z.input<typeof createStudentSchema>;

export const updateStudentSchema = z.object({
  registerNumber: z
    .string()
    .trim()
    .min(1, "Register Number cannot be empty")
    .max(50, "Register Number cannot exceed 50 characters")
    .optional(),
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .max(150, "Name cannot exceed 150 characters")
    .optional(),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  phone: z
    .string()
    .trim()
    .max(25, "Phone number cannot exceed 25 characters")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  dateOfBirth: z
    .union([z.string(), z.date()])
    .optional()
    .nullable()
    .transform((val) => {
      if (val === undefined) return undefined;
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }),
  programId: z.string().min(1, "Please select a Program").optional(),
  departmentId: z
    .string()
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  batchId: z.string().min(1, "Please select an Admission Batch").optional(),
  academicPeriodId: z
    .string()
    .min(1, "Please select an Academic Period / Semester")
    .optional(),
  isActive: z.boolean().optional(),
  customFields: z.record(z.string(), z.any()).optional(),
});

export type UpdateStudentInput = z.input<typeof updateStudentSchema>;

export const studentFilterSchema = z.object({
  departmentId: z.union([z.string(), z.array(z.string())]).optional(),
  programId: z.string().optional(),
  batchId: z.string().optional(),
  academicPeriodId: z.string().optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
});

export type StudentFilterInput = z.input<typeof studentFilterSchema>;
