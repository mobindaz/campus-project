import { z } from "zod";
import { authorize, AuthUser } from "@/server/authorization";
import { logAudit } from "@/server/services/audit.service";
import * as repo from "@/server/repositories/dynamic-form.repository";
import {
  createFormDefinitionSchema,
  updateFormDefinitionSchema,
  createFormFieldSchema,
  updateFormFieldSchema,
  CreateFormDefinitionInput,
  UpdateFormDefinitionInput,
  CreateFormFieldInput,
  UpdateFormFieldInput,
} from "@/modules/dynamic-forms/schemas";
import { FormDefinitionDto, FormFieldDto } from "@/modules/dynamic-forms/types";
import { BadRequestError, NotFoundError } from "@/server/errors/app-error";

export const PERMISSION_FORMS_MANAGE = "forms.manage";

export const DEFAULT_FORM_DEFINITIONS = [
  {
    code: "STUDENT_FORM",
    name: "Student Registration Form",
    entityType: "STUDENT",
    description: "Standard student onboarding and profile form.",
    fields: [
      {
        fieldKey: "registerNumber",
        label: "Register Number / Roll No.",
        type: "TEXT",
        isCore: true,
        required: true,
        order: 0,
        placeholder: "e.g. 2026CSE001",
        helpText: "Unique institutional student register number",
      },
      {
        fieldKey: "name",
        label: "Full Name",
        type: "TEXT",
        isCore: true,
        required: true,
        order: 1,
        placeholder: "Full student name",
      },
      {
        fieldKey: "email",
        label: "Email Address",
        type: "EMAIL",
        isCore: true,
        required: false,
        order: 2,
        placeholder: "student@college.edu",
      },
      {
        fieldKey: "phone",
        label: "Phone Number",
        type: "PHONE",
        isCore: true,
        required: false,
        order: 3,
        placeholder: "+91 9876543210",
      },
      {
        fieldKey: "dateOfBirth",
        label: "Date of Birth",
        type: "DATE",
        isCore: true,
        required: false,
        order: 4,
      },
      {
        fieldKey: "programId",
        label: "Degree Program",
        type: "PROGRAM_SELECT",
        isCore: true,
        required: true,
        order: 5,
        helpText: "Select student degree/diploma program",
      },
      {
        fieldKey: "departmentId",
        label: "Department",
        type: "DEPARTMENT_SELECT",
        isCore: true,
        required: true,
        order: 6,
      },
      {
        fieldKey: "batchId",
        label: "Admission Batch",
        type: "BATCH_SELECT",
        isCore: true,
        required: true,
        order: 7,
      },
      {
        fieldKey: "academicPeriodId",
        label: "Academic Period / Semester",
        type: "ACADEMIC_PERIOD_SELECT",
        isCore: true,
        required: true,
        order: 8,
      },
    ],
  },
  {
    code: "TC_REQUEST_FORM",
    name: "Transfer Certificate Request Form",
    entityType: "TC_REQUEST",
    description: "Student application form for Transfer Certificate issuance.",
    fields: [
      {
        fieldKey: "studentRegisterNumber",
        label: "Student Register Number",
        type: "TEXT",
        isCore: true,
        required: true,
        order: 0,
        placeholder: "Enter student register number",
      },
      {
        fieldKey: "reasonForTc",
        label: "Reason for Leaving / TC Request",
        type: "TEXTAREA",
        isCore: true,
        required: true,
        order: 1,
        placeholder: "Provide reason for requesting Transfer Certificate...",
        helpText: "Detail reason for leaving institution",
      },
      {
        fieldKey: "leavingDate",
        label: "Expected Date of Leaving",
        type: "DATE",
        isCore: true,
        required: false,
        order: 2,
      },
    ],
  },
  {
    code: "PLACEMENT_REGISTRATION_FORM",
    name: "Placement Drive Registration Form",
    entityType: "PLACEMENT_REGISTRATION",
    description: "Student registration form for campus recruitment drives.",
    fields: [
      {
        fieldKey: "studentRegisterNumber",
        label: "Student Register Number",
        type: "TEXT",
        isCore: true,
        required: true,
        order: 0,
      },
      {
        fieldKey: "placementDriveId",
        label: "Placement Drive",
        type: "DRIVE_SELECT",
        isCore: true,
        required: true,
        order: 1,
      },
      {
        fieldKey: "cgpa",
        label: "Current CGPA / Percentage",
        type: "DECIMAL",
        isCore: true,
        required: true,
        order: 2,
        placeholder: "e.g. 8.45",
        validation: { min: 0, max: 10 },
      },
      {
        fieldKey: "backlogs",
        label: "Active Standing Backlogs",
        type: "NUMBER",
        isCore: true,
        required: true,
        order: 3,
        defaultValue: 0,
        validation: { min: 0 },
      },
    ],
  },
];

import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/server/database";

/**
 * Ensure standard forms are populated in database if missing.
 */
export async function ensureDefaultFormDefinitions(
  db: PrismaClient = defaultPrisma
) {
  for (const def of DEFAULT_FORM_DEFINITIONS) {
    const existing = await repo.findFormDefinitionByCode(def.code, true, db);
    if (!existing) {
      await repo.createFormDefinition(def, db);
    }
  }
}

/**
 * Get form definition by code.
 */
export async function getFormDefinitionByCodeService(
  user: AuthUser | null,
  code: string,
  includeInactiveFields: boolean = false
): Promise<FormDefinitionDto> {
  let formDef = await repo.findFormDefinitionByCode(
    code,
    includeInactiveFields
  );

  // Auto-seed if missing
  if (!formDef) {
    const defaultSpec = DEFAULT_FORM_DEFINITIONS.find((d) => d.code === code);
    if (defaultSpec) {
      await repo.createFormDefinition(defaultSpec);
      formDef = await repo.findFormDefinitionByCode(
        code,
        includeInactiveFields
      );
    }
  }

  if (!formDef) {
    throw new NotFoundError(`Form definition with code '${code}' not found.`);
  }

  return formDef as FormDefinitionDto;
}

/**
 * List all form definitions.
 */
export async function listFormDefinitionsService(
  user: AuthUser | null
): Promise<FormDefinitionDto[]> {
  await authorize(user, PERMISSION_FORMS_MANAGE);
  await ensureDefaultFormDefinitions();
  return (await repo.listFormDefinitions()) as FormDefinitionDto[];
}

/**
 * Create a new form definition.
 */
export async function createFormDefinitionService(
  user: AuthUser | null,
  input: CreateFormDefinitionInput
) {
  await authorize(user, PERMISSION_FORMS_MANAGE);
  const validated = createFormDefinitionSchema.parse(
    input
  ) as CreateFormDefinitionInput;

  const existing = await repo.findFormDefinitionByCode(validated.code, true);
  if (existing) {
    throw new BadRequestError(
      `Form definition with code '${validated.code}' already exists.`
    );
  }

  const created = await repo.createFormDefinition(
    validated as CreateFormDefinitionInput
  );

  await logAudit({
    userId: user?.id,
    userEmail: user?.email,
    action: "FORM_DEFINITION_CREATE",
    entity: "FormDefinition",
    entityId: created.id,
    details: { code: created.code, name: created.name },
  });

  return created;
}

/**
 * Update an existing form definition.
 */
export async function updateFormDefinitionService(
  user: AuthUser | null,
  id: string,
  input: UpdateFormDefinitionInput
) {
  await authorize(user, PERMISSION_FORMS_MANAGE);

  const existing = await repo.findFormDefinitionById(id);
  if (!existing) {
    throw new NotFoundError(`Form definition with ID '${id}' not found.`);
  }

  const validated = updateFormDefinitionSchema.parse(input);
  const updated = await repo.updateFormDefinition(id, validated);

  await logAudit({
    userId: user?.id,
    userEmail: user?.email,
    action: "FORM_DEFINITION_UPDATE",
    entity: "FormDefinition",
    entityId: updated.id,
    details: { code: updated.code, name: updated.name },
  });

  return updated;
}

/**
 * Add a field to a form definition.
 */
export async function addFormFieldService(
  user: AuthUser | null,
  formDefinitionId: string,
  input: CreateFormFieldInput
) {
  await authorize(user, PERMISSION_FORMS_MANAGE);

  const formDef = await repo.findFormDefinitionById(formDefinitionId);
  if (!formDef) {
    throw new NotFoundError(
      `Form definition with ID '${formDefinitionId}' not found.`
    );
  }

  const validated = createFormFieldSchema.parse(input) as CreateFormFieldInput;

  const existingKey = await repo.findFormFieldByKey(
    formDefinitionId,
    validated.fieldKey
  );
  if (existingKey) {
    throw new BadRequestError(
      `Field with key '${validated.fieldKey}' already exists in form '${formDef.code}'.`
    );
  }

  // Calculate order if not specified
  if (validated.order === undefined || validated.order === 0) {
    const maxOrder = formDef.fields.reduce(
      (max, f) => Math.max(max, f.order),
      -1
    );
    validated.order = maxOrder + 1;
  }

  const createdField = await repo.createFormField(
    formDefinitionId,
    validated as CreateFormFieldInput
  );

  await logAudit({
    userId: user?.id,
    userEmail: user?.email,
    action: "FORM_FIELD_ADD",
    entity: "FormField",
    entityId: createdField.id,
    details: {
      formCode: formDef.code,
      fieldKey: createdField.fieldKey,
      label: createdField.label,
    },
  });

  return createdField;
}

/**
 * Update a form field.
 */
export async function updateFormFieldService(
  user: AuthUser | null,
  fieldId: string,
  input: UpdateFormFieldInput
) {
  await authorize(user, PERMISSION_FORMS_MANAGE);

  const existingField = await repo.findFormFieldById(fieldId);
  if (!existingField) {
    throw new NotFoundError(`Form field with ID '${fieldId}' not found.`);
  }

  const validated = updateFormFieldSchema.parse(input) as UpdateFormFieldInput;

  const updatedField = await repo.updateFormField(
    fieldId,
    validated as UpdateFormFieldInput
  );

  await logAudit({
    userId: user?.id,
    userEmail: user?.email,
    action: "FORM_FIELD_UPDATE",
    entity: "FormField",
    entityId: updatedField.id,
    details: {
      formDefinitionId: existingField.formDefinitionId,
      fieldKey: existingField.fieldKey,
    },
  });

  return updatedField;
}

/**
 * Delete a form field (Prevents deletion if isCore === true).
 */
export async function deleteFormFieldService(
  user: AuthUser | null,
  fieldId: string
) {
  await authorize(user, PERMISSION_FORMS_MANAGE);

  const existingField = await repo.findFormFieldById(fieldId);
  if (!existingField) {
    throw new NotFoundError(`Form field with ID '${fieldId}' not found.`);
  }

  if (existingField.isCore) {
    throw new BadRequestError(
      `Core relational/system field '${existingField.label}' cannot be removed from the form.`
    );
  }

  const deleted = await repo.deleteFormField(fieldId);

  await logAudit({
    userId: user?.id,
    userEmail: user?.email,
    action: "FORM_FIELD_DELETE",
    entity: "FormField",
    entityId: fieldId,
    details: {
      formDefinitionId: existingField.formDefinitionId,
      fieldKey: existingField.fieldKey,
    },
  });

  return deleted;
}

/**
 * Reorder form fields.
 */
export async function reorderFormFieldsService(
  user: AuthUser | null,
  formDefinitionId: string,
  fieldIds: string[]
) {
  await authorize(user, PERMISSION_FORMS_MANAGE);

  const formDef = await repo.findFormDefinitionById(formDefinitionId);
  if (!formDef) {
    throw new NotFoundError(
      `Form definition with ID '${formDefinitionId}' not found.`
    );
  }

  await repo.reorderFormFields(formDefinitionId, fieldIds);

  await logAudit({
    userId: user?.id,
    userEmail: user?.email,
    action: "FORM_FIELD_REORDER",
    entity: "FormDefinition",
    entityId: formDefinitionId,
    details: { formCode: formDef.code, fieldIds },
  });

  return { success: true };
}

/**
 * Extract option values from Json options.
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
 * Dynamic Runtime Zod Schema Generator from FormField definitions.
 */
export function generateDynamicZodSchema(
  fields: FormFieldDto[] | Record<string, unknown>[]
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  const activeFields = fields.filter((f) => f.isActive !== false);

  for (const field of activeFields) {
    const fieldKey = String(field.fieldKey);
    const label = String(field.label || fieldKey);
    const type = String(field.type);
    const required = Boolean(field.required);
    const options = field.options;
    const valConfig = (field.validation || {}) as {
      min?: number;
      max?: number;
      minLength?: number;
      maxLength?: number;
      pattern?: string;
    };

    let fieldSchema: z.ZodTypeAny;

    switch (type) {
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
            strSchema = strSchema.regex(
              new RegExp(valConfig.pattern),
              `${label} format is invalid`
            );
          } catch {
            // Ignore invalid regex string
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
        if (required) {
          fieldSchema = z
            .string()
            .min(1, `${label} is required`)
            .email(`Invalid email address for ${label}`);
        } else {
          fieldSchema = z.preprocess(
            (val) => (val === "" || val === null ? undefined : val),
            z
              .string()
              .email(`Invalid email address for ${label}`)
              .optional()
              .nullable()
          );
        }
        break;
      }

      case "PHONE": {
        const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
        if (required) {
          fieldSchema = z
            .string()
            .min(1, `${label} is required`)
            .regex(phoneRegex, `Invalid phone number format for ${label}`);
        } else {
          fieldSchema = z.preprocess(
            (val) => (val === "" || val === null ? undefined : val),
            z
              .string()
              .regex(phoneRegex, `Invalid phone number format for ${label}`)
              .optional()
              .nullable()
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
        if (required) {
          fieldSchema = z
            .string()
            .min(1, `${label} is required`)
            .regex(dateRegex, `${label} must be a valid date (YYYY-MM-DD)`);
        } else {
          fieldSchema = z.preprocess(
            (val) => (val === "" || val === null ? undefined : val),
            z
              .string()
              .regex(dateRegex, `${label} must be a valid date (YYYY-MM-DD)`)
              .optional()
              .nullable()
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

      case "PROGRAM_SELECT":
      case "DEPARTMENT_SELECT":
      case "BATCH_SELECT":
      case "ACADEMIC_PERIOD_SELECT":
      case "STUDENT_SELECT":
      case "DRIVE_SELECT": {
        if (required) {
          fieldSchema = z.string().min(1, `${label} is required`);
        } else {
          fieldSchema = z.preprocess(
            (val) => (val === "" || val === null ? undefined : val),
            z.string().optional().nullable()
          );
        }
        break;
      }

      default: {
        fieldSchema = required ? z.any() : z.any().optional();
        break;
      }
    }

    shape[fieldKey] = fieldSchema;
  }

  return z.object(shape).passthrough();
}
