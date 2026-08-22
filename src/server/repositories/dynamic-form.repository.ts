import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/server/database";
import {
  CreateFormDefinitionInput,
  UpdateFormDefinitionInput,
  CreateFormFieldInput,
  UpdateFormFieldInput,
} from "@/modules/dynamic-forms/types";

export async function findFormDefinitionByCode(
  code: string,
  includeInactiveFields: boolean = false,
  db: PrismaClient = defaultPrisma
) {
  return db.formDefinition.findUnique({
    where: { code },
    include: {
      fields: {
        where: includeInactiveFields ? undefined : { isActive: true },
        orderBy: { order: "asc" },
        include: {
          customField: true,
        },
      },
    },
  });
}

export async function findFormDefinitionById(
  id: string,
  db: PrismaClient = defaultPrisma
) {
  return db.formDefinition.findUnique({
    where: { id },
    include: {
      fields: {
        orderBy: { order: "asc" },
        include: {
          customField: true,
        },
      },
    },
  });
}

export async function listFormDefinitions(db: PrismaClient = defaultPrisma) {
  return db.formDefinition.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      fields: {
        orderBy: { order: "asc" },
      },
    },
  });
}

export async function createFormDefinition(
  input: CreateFormDefinitionInput,
  db: PrismaClient = defaultPrisma
) {
  const { fields, ...formProps } = input;
  return db.formDefinition.create({
    data: {
      ...formProps,
      fields:
        fields && fields.length > 0
          ? {
              create: fields.map((f, idx) => ({
                fieldKey: f.fieldKey,
                label: f.label,
                type: f.type,
                isCore: f.isCore ?? false,
                customFieldId: f.customFieldId ?? undefined,
                required: f.required ?? false,
                order: f.order ?? idx,
                placeholder: f.placeholder ?? undefined,
                helpText: f.helpText ?? undefined,
                options: f.options ? (f.options as object) : undefined,
                validation: f.validation ? (f.validation as object) : undefined,
                defaultValue: f.defaultValue
                  ? (f.defaultValue as object)
                  : undefined,
                isActive: f.isActive ?? true,
              })),
            }
          : undefined,
    },
    include: {
      fields: {
        orderBy: { order: "asc" },
      },
    },
  });
}

export async function updateFormDefinition(
  id: string,
  input: UpdateFormDefinitionInput,
  db: PrismaClient = defaultPrisma
) {
  return db.formDefinition.update({
    where: { id },
    data: input,
    include: {
      fields: {
        orderBy: { order: "asc" },
      },
    },
  });
}

export async function findFormFieldById(
  id: string,
  db: PrismaClient = defaultPrisma
) {
  return db.formField.findUnique({
    where: { id },
    include: {
      formDefinition: true,
    },
  });
}

export async function findFormFieldByKey(
  formDefinitionId: string,
  fieldKey: string,
  db: PrismaClient = defaultPrisma
) {
  return db.formField.findUnique({
    where: {
      formDefinitionId_fieldKey: {
        formDefinitionId,
        fieldKey,
      },
    },
  });
}

export async function createFormField(
  formDefinitionId: string,
  input: CreateFormFieldInput,
  db: PrismaClient = defaultPrisma
) {
  return db.formField.create({
    data: {
      formDefinitionId,
      fieldKey: input.fieldKey,
      label: input.label,
      type: input.type,
      isCore: input.isCore ?? false,
      customFieldId: input.customFieldId ?? undefined,
      required: input.required ?? false,
      order: input.order ?? 0,
      placeholder: input.placeholder ?? undefined,
      helpText: input.helpText ?? undefined,
      options: input.options ? (input.options as object) : undefined,
      validation: input.validation ? (input.validation as object) : undefined,
      defaultValue: input.defaultValue
        ? (input.defaultValue as object)
        : undefined,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateFormField(
  id: string,
  input: UpdateFormFieldInput,
  db: PrismaClient = defaultPrisma
) {
  return db.formField.update({
    where: { id },
    data: {
      label: input.label,
      type: input.type,
      required: input.required,
      order: input.order,
      placeholder: input.placeholder,
      helpText: input.helpText,
      options:
        input.options !== undefined ? (input.options as object) : undefined,
      validation:
        input.validation !== undefined
          ? (input.validation as object)
          : undefined,
      defaultValue:
        input.defaultValue !== undefined
          ? (input.defaultValue as object)
          : undefined,
      isActive: input.isActive,
    },
  });
}

export async function deleteFormField(
  id: string,
  db: PrismaClient = defaultPrisma
) {
  return db.formField.delete({
    where: { id },
  });
}

export async function reorderFormFields(
  formDefinitionId: string,
  fieldIds: string[],
  db: PrismaClient = defaultPrisma
) {
  return db.$transaction(
    fieldIds.map((id, index) =>
      db.formField.update({
        where: { id },
        data: { order: index },
      })
    )
  );
}
