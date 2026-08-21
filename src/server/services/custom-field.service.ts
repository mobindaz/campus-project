import { z } from "zod";
import { authorize, AuthUser } from "@/server/authorization";
import { logAudit } from "@/server/services/audit.service";
import * as repo from "@/server/repositories/custom-field.repository";
import {
  createCustomFieldDefinitionSchema,
  updateCustomFieldDefinitionSchema,
  CreateCustomFieldDefinitionInput,
  UpdateCustomFieldDefinitionInput,
} from "@/modules/custom-fields/schemas";
import {
  CustomFieldDefinitionDto,
  CustomFieldType,
} from "@/modules/custom-fields/types";
import { BadRequestError, NotFoundError } from "@/server/errors/app-error";

export const PERMISSION_FIELDS_MANAGE = "fields.manage";

/**
 * List custom field definitions for an entity type.
 */
export async function listCustomFieldDefinitionsService(
  user: AuthUser | null,
  entityType?: string,
  includeInactive: boolean = false
) {
  await authorize(user, PERMISSION_FIELDS_MANAGE);
  return repo.listCustomFieldDefinitions(entityType, includeInactive);
}

/**
 * Create a new custom field definition.
 */
export async function createCustomFieldDefinitionService(
  user: AuthUser | null,
  input: CreateCustomFieldDefinitionInput
) {
  await authorize(user, PERMISSION_FIELDS_MANAGE);

  const validated = createCustomFieldDefinitionSchema.parse(input);

  // Check if a field with this name already exists for the entityType
  const existing = await repo.findCustomFieldDefinitionByName(
    validated.entityType,
    validated.name
  );

  if (existing) {
    throw new BadRequestError(
      `Custom field with name '${validated.name}' already exists for entity type '${validated.entityType}'.`
    );
  }

  const created = await repo.createCustomFieldDefinition({
    entityType: validated.entityType,
    name: validated.name,
    label: validated.label,
    type: validated.type as CustomFieldType,
    required: validated.required,
    unique: validated.unique,
    defaultValue: validated.defaultValue ?? undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validation: (validated.validation as any) ?? undefined,
    visibility: validated.visibility,
    order: validated.order,
    helpText: validated.helpText ?? null,
    options: (validated.options as string[]) ?? undefined,
    isActive: validated.isActive,
  });

  await logAudit({
    userId: user?.id,
    userEmail: user?.email,
    action: "CUSTOM_FIELD_CREATE",
    entity: "CustomFieldDefinition",
    entityId: created.id,
    details: {
      entityType: created.entityType,
      name: created.name,
      label: created.label,
    },
  });

  return created;
}

/**
 * Update an existing custom field definition.
 */
export async function updateCustomFieldDefinitionService(
  user: AuthUser | null,
  id: string,
  input: UpdateCustomFieldDefinitionInput
) {
  await authorize(user, PERMISSION_FIELDS_MANAGE);

  const existing = await repo.findCustomFieldDefinitionById(id);
  if (!existing) {
    throw new NotFoundError(
      `Custom field definition with ID '${id}' not found.`
    );
  }

  const validated = updateCustomFieldDefinitionSchema.parse(input);

  const updated = await repo.updateCustomFieldDefinition(id, {
    label: validated.label,
    type: validated.type ? (validated.type as CustomFieldType) : undefined,
    required: validated.required,
    unique: validated.unique,
    defaultValue: validated.defaultValue,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validation: (validated.validation as any) ?? undefined,
    visibility: validated.visibility,
    order: validated.order,
    helpText: validated.helpText,
    options: (validated.options as string[]) ?? undefined,
    isActive: validated.isActive,
  });

  await logAudit({
    userId: user?.id,
    userEmail: user?.email,
    action: "CUSTOM_FIELD_UPDATE",
    entity: "CustomFieldDefinition",
    entityId: updated.id,
    details: { entityType: updated.entityType, name: updated.name },
  });

  return updated;
}

/**
 * Toggle custom field definition active status.
 */
export async function toggleCustomFieldStatusService(
  user: AuthUser | null,
  id: string,
  isActive: boolean
) {
  await authorize(user, PERMISSION_FIELDS_MANAGE);

  const existing = await repo.findCustomFieldDefinitionById(id);
  if (!existing) {
    throw new NotFoundError(
      `Custom field definition with ID '${id}' not found.`
    );
  }

  const updated = await repo.updateCustomFieldDefinition(id, { isActive });

  await logAudit({
    userId: user?.id,
    userEmail: user?.email,
    action: isActive ? "CUSTOM_FIELD_ACTIVATE" : "CUSTOM_FIELD_DEACTIVATE",
    entity: "CustomFieldDefinition",
    entityId: id,
    details: { entityType: existing.entityType, name: existing.name, isActive },
  });

  return updated;
}

/**
 * Delete a custom field definition.
 */
export async function deleteCustomFieldDefinitionService(
  user: AuthUser | null,
  id: string
) {
  await authorize(user, PERMISSION_FIELDS_MANAGE);

  const existing = await repo.findCustomFieldDefinitionById(id);
  if (!existing) {
    throw new NotFoundError(
      `Custom field definition with ID '${id}' not found.`
    );
  }

  const deleted = await repo.deleteCustomFieldDefinition(id);

  await logAudit({
    userId: user?.id,
    userEmail: user?.email,
    action: "CUSTOM_FIELD_DELETE",
    entity: "CustomFieldDefinition",
    entityId: id,
    details: { entityType: existing.entityType, name: existing.name },
  });

  return deleted;
}

/**
 * Reorder custom field definitions for an entity type.
 */
export async function reorderCustomFieldDefinitionsService(
  user: AuthUser | null,
  entityType: string,
  orderedIds: string[]
) {
  await authorize(user, PERMISSION_FIELDS_MANAGE);

  await repo.reorderCustomFieldDefinitions(entityType, orderedIds);

  await logAudit({
    userId: user?.id,
    userEmail: user?.email,
    action: "CUSTOM_FIELD_REORDER",
    entity: "CustomFieldDefinition",
    entityId: entityType,
    details: { entityType, orderedIds },
  });

  return { success: true };
}

/**
 * Extract valid string values from options Json.
 */
function extractOptionValues(options: unknown): string[] {
  if (!options || !Array.isArray(options)) return [];
  return options.map((opt) => {
    if (typeof opt === "string") return opt;
    if (typeof opt === "object" && opt !== null && "value" in opt)
      return String(opt.value);
    return String(opt);
  });
}

/**
 * Dynamic Runtime Zod Schema Generator
 * Converts a list of CustomFieldDefinition models into a Zod validation schema for the customFields JSON object.
 */
export function generateCustomFieldsZodSchema(
  definitions: (CustomFieldDefinitionDto | Record<string, unknown>)[]
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  const activeDefs = definitions.filter((d) => d.isActive !== false);

  for (const def of activeDefs) {
    const { name, label, type, required, validation, options } = def;
    const valConfig = (validation || {}) as {
      min?: number;
      max?: number;
      minLength?: number;
      maxLength?: number;
      pattern?: string;
    };

    let fieldSchema: z.ZodTypeAny;

    switch (type as CustomFieldType) {
      case "TEXT":
      case "TEXTAREA": {
        let strSchema = z.string();
        if (valConfig.minLength !== undefined && valConfig.minLength > 0) {
          strSchema = strSchema.min(
            valConfig.minLength,
            `${label} must be at least ${valConfig.minLength} characters`
          );
        }
        if (valConfig.maxLength !== undefined && valConfig.maxLength > 0) {
          strSchema = strSchema.max(
            valConfig.maxLength,
            `${label} cannot exceed ${valConfig.maxLength} characters`
          );
        }
        if (valConfig.pattern) {
          try {
            const regex = new RegExp(valConfig.pattern);
            strSchema = strSchema.regex(regex, `${label} format is invalid`);
          } catch {
            // Ignore invalid regex in definition
          }
        }

        if (required) {
          fieldSchema = strSchema.min(1, `${label} is required`);
        } else {
          fieldSchema = z.preprocess(
            (val) => (val === "" || val === null ? undefined : val),
            strSchema.optional().nullable()
          );
        }
        break;
      }

      case "EMAIL": {
        const emailSchema = z
          .string()
          .email(`Invalid email address for ${label}`);

        if (required) {
          fieldSchema = z
            .string()
            .min(1, `${label} is required`)
            .email(`Invalid email address for ${label}`);
        } else {
          fieldSchema = z.preprocess(
            (val) => (val === "" || val === null ? undefined : val),
            emailSchema.optional().nullable()
          );
        }
        break;
      }

      case "PHONE": {
        const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
        let phoneSchema = z.string();

        if (valConfig.pattern) {
          try {
            phoneSchema = phoneSchema.regex(
              new RegExp(valConfig.pattern),
              `${label} format is invalid`
            );
          } catch {
            phoneSchema = phoneSchema.regex(
              phoneRegex,
              `${label} format is invalid`
            );
          }
        } else {
          phoneSchema = phoneSchema.regex(
            phoneRegex,
            `Invalid phone number format for ${label}`
          );
        }

        if (required) {
          fieldSchema = phoneSchema;
        } else {
          fieldSchema = z.preprocess(
            (val) => (val === "" || val === null ? undefined : val),
            phoneSchema.optional().nullable()
          );
        }
        break;
      }

      case "URL": {
        const urlSchema = z.string().url(`Invalid URL format for ${label}`);

        if (required) {
          fieldSchema = z
            .string()
            .min(1, `${label} is required`)
            .url(`Invalid URL format for ${label}`);
        } else {
          fieldSchema = z.preprocess(
            (val) => (val === "" || val === null ? undefined : val),
            urlSchema.optional().nullable()
          );
        }
        break;
      }

      case "NUMBER": {
        let numSchema = z.coerce.number().int(`${label} must be an integer`);

        if (valConfig.min !== undefined) {
          numSchema = numSchema.min(
            valConfig.min,
            `${label} minimum value is ${valConfig.min}`
          );
        }
        if (valConfig.max !== undefined) {
          numSchema = numSchema.max(
            valConfig.max,
            `${label} maximum value is ${valConfig.max}`
          );
        }

        if (required) {
          fieldSchema = numSchema;
        } else {
          fieldSchema = z.preprocess(
            (val) =>
              val === "" || val === null || val === undefined ? undefined : val,
            numSchema.optional().nullable()
          );
        }
        break;
      }

      case "DECIMAL":
      case "CURRENCY": {
        let decSchema = z.coerce.number();

        if (valConfig.min !== undefined) {
          decSchema = decSchema.min(
            valConfig.min,
            `${label} minimum value is ${valConfig.min}`
          );
        }
        if (valConfig.max !== undefined) {
          decSchema = decSchema.max(
            valConfig.max,
            `${label} maximum value is ${valConfig.max}`
          );
        }

        if (required) {
          fieldSchema = decSchema;
        } else {
          fieldSchema = z.preprocess(
            (val) =>
              val === "" || val === null || val === undefined ? undefined : val,
            decSchema.optional().nullable()
          );
        }
        break;
      }

      case "DATE": {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const dateSchema = z
          .string()
          .regex(dateRegex, `${label} must be a valid date (YYYY-MM-DD)`);

        if (required) {
          fieldSchema = dateSchema;
        } else {
          fieldSchema = z.preprocess(
            (val) => (val === "" || val === null ? undefined : val),
            dateSchema.optional().nullable()
          );
        }
        break;
      }

      case "DATETIME": {
        const datetimeSchema = z.string();

        if (required) {
          fieldSchema = datetimeSchema.min(1, `${label} is required`);
        } else {
          fieldSchema = z.preprocess(
            (val) => (val === "" || val === null ? undefined : val),
            datetimeSchema.optional().nullable()
          );
        }
        break;
      }

      case "DROPDOWN":
      case "RADIO": {
        const validValues = extractOptionValues(options);
        let optSchema = z.string();

        if (validValues.length > 0) {
          optSchema = optSchema.refine((val) => validValues.includes(val), {
            message: `Invalid option selected for ${label}`,
          });
        }

        if (required) {
          fieldSchema = optSchema.min(1, `${label} is required`);
        } else {
          fieldSchema = z.preprocess(
            (val) => (val === "" || val === null ? undefined : val),
            optSchema.optional().nullable()
          );
        }
        break;
      }

      case "MULTI_SELECT": {
        const validValues = extractOptionValues(options);
        let arrSchema = z.array(z.string());

        if (validValues.length > 0) {
          arrSchema = z.array(
            z.string().refine((val) => validValues.includes(val), {
              message: `Invalid selection in ${label}`,
            })
          );
        }

        if (required) {
          fieldSchema = arrSchema.min(
            1,
            `At least one selection required for ${label}`
          );
        } else {
          fieldSchema = z.preprocess(
            (val) => (!val ? [] : Array.isArray(val) ? val : [val]),
            arrSchema.optional().default([])
          );
        }
        break;
      }

      case "CHECKBOX": {
        const boolSchema = z.preprocess(
          (val) => val === "true" || val === true || val === 1 || val === "1",
          z.boolean()
        );

        if (required) {
          fieldSchema = boolSchema.refine((val) => val === true, {
            message: `${label} must be checked`,
          });
        } else {
          fieldSchema = boolSchema.optional().default(false);
        }
        break;
      }

      case "FILE":
      case "IMAGE": {
        const fileSchema = z.string();

        if (required) {
          fieldSchema = fileSchema.min(1, `${label} upload is required`);
        } else {
          fieldSchema = z.preprocess(
            (val) => (val === "" || val === null ? undefined : val),
            fileSchema.optional().nullable()
          );
        }
        break;
      }

      default: {
        fieldSchema = required ? z.any() : z.any().optional();
        break;
      }
    }

    shape[String(name)] = fieldSchema;
  }

  return z.object(shape).passthrough();
}
