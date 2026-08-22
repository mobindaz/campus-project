import { z } from "zod";

export const formFieldValidationSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
    minLength: z.number().int().min(0).optional(),
    maxLength: z.number().int().min(0).optional(),
    pattern: z.string().optional(),
  })
  .optional()
  .nullable();

export const createFormFieldSchema = z.object({
  fieldKey: z
    .string()
    .min(1, "Field key is required")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Field key must be alphanumeric (letters, numbers, underscores)"
    ),
  label: z.string().min(1, "Label is required"),
  type: z.string().min(1, "Field type is required"),
  isCore: z.boolean().default(false),
  customFieldId: z.string().optional().nullable(),
  required: z.boolean().default(false),
  order: z.number().int().default(0),
  placeholder: z.string().optional().nullable(),
  helpText: z.string().optional().nullable(),
  options: z.unknown().optional().nullable(),
  validation: formFieldValidationSchema,
  defaultValue: z.unknown().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateFormFieldSchema = z.object({
  label: z.string().min(1, "Label is required").optional(),
  type: z.string().min(1, "Field type is required").optional(),
  required: z.boolean().optional(),
  order: z.number().int().optional(),
  placeholder: z.string().optional().nullable(),
  helpText: z.string().optional().nullable(),
  options: z.unknown().optional().nullable(),
  validation: formFieldValidationSchema,
  defaultValue: z.unknown().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const createFormDefinitionSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .regex(
      /^[A-Z0-9_]+$/,
      "Form code must be uppercase alphanumeric (e.g. STUDENT_FORM)"
    ),
  name: z.string().min(1, "Form name is required"),
  entityType: z.string().min(1, "Entity type is required"),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  fields: z.array(createFormFieldSchema).optional().default([]),
});

export const updateFormDefinitionSchema = z.object({
  name: z.string().min(1, "Form name is required").optional(),
  entityType: z.string().min(1, "Entity type is required").optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const reorderFormFieldsSchema = z.object({
  formDefinitionId: z.string().min(1, "Form definition ID is required"),
  fieldIds: z.array(z.string().min(1)),
});

export type CreateFormFieldInput = z.infer<typeof createFormFieldSchema>;
export type UpdateFormFieldInput = z.infer<typeof updateFormFieldSchema>;
export type CreateFormDefinitionInput = z.infer<
  typeof createFormDefinitionSchema
>;
export type UpdateFormDefinitionInput = z.infer<
  typeof updateFormDefinitionSchema
>;
