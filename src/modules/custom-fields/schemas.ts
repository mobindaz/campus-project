import { z } from "zod";

export const customFieldTypeEnum = z.enum([
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "DECIMAL",
  "EMAIL",
  "PHONE",
  "DATE",
  "DATETIME",
  "DROPDOWN",
  "MULTI_SELECT",
  "RADIO",
  "CHECKBOX",
  "FILE",
  "IMAGE",
  "URL",
  "CURRENCY",
]);

export const customFieldValidationSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
    minLength: z.number().int().min(0).optional(),
    maxLength: z.number().int().min(1).optional(),
    pattern: z.string().optional(),
  })
  .optional()
  .nullable();

export const customFieldOptionSchema = z.union([
  z.string(),
  z.object({
    label: z.string(),
    value: z.string(),
  }),
]);

export const createCustomFieldDefinitionSchema = z.object({
  entityType: z.string().min(1, "Entity type is required").toUpperCase(),
  name: z
    .string()
    .min(2, "Field identifier must be at least 2 characters")
    .max(50, "Field identifier cannot exceed 50 characters")
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_]*$/,
      "Field name must start with a letter and contain only alphanumeric characters or underscores"
    ),
  label: z
    .string()
    .min(2, "Display label must be at least 2 characters")
    .max(100, "Display label cannot exceed 100 characters"),
  type: customFieldTypeEnum,
  required: z.boolean().default(false),
  unique: z.boolean().default(false),
  defaultValue: z.any().optional(),
  validation: customFieldValidationSchema,
  visibility: z.enum(["ALL", "ADMIN_ONLY", "READ_ONLY"]).default("ALL"),
  order: z.number().int().default(0),
  helpText: z.string().max(255).optional().nullable(),
  options: z.array(customFieldOptionSchema).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateCustomFieldDefinitionSchema =
  createCustomFieldDefinitionSchema
    .omit({ entityType: true, name: true })
    .partial();

export const reorderCustomFieldDefinitionsSchema = z.object({
  entityType: z.string().min(1),
  orderedIds: z.array(z.string()),
});

export type CreateCustomFieldDefinitionInput = z.infer<
  typeof createCustomFieldDefinitionSchema
>;
export type UpdateCustomFieldDefinitionInput = z.infer<
  typeof updateCustomFieldDefinitionSchema
>;
