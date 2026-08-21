import React from "react";
import { requireAuth } from "@/server/services/auth.service";
import { authorize } from "@/server/authorization";
import { listCustomFieldDefinitionsService } from "@/server/services/custom-field.service";
import { CustomFieldManagementClient } from "@/modules/custom-fields/components/custom-field-management-client";
import {
  CustomFieldDefinitionDto,
  CustomFieldType,
  CustomFieldValidation,
  CustomFieldVisibility,
  CustomFieldOption,
} from "@/modules/custom-fields/types";

export default async function CustomFieldsPage() {
  const session = await requireAuth({ redirectTo: "/fields" });
  await authorize(session.user, "fields.manage");

  const fields = await listCustomFieldDefinitionsService(
    session.user,
    undefined,
    true
  );

  const serializedFields: CustomFieldDefinitionDto[] = fields.map((f) => ({
    id: f.id,
    entityType: f.entityType,
    name: f.name,
    label: f.label,
    type: f.type as CustomFieldType,
    required: f.required,
    unique: f.unique,
    defaultValue: f.defaultValue,
    validation: (f.validation as unknown as CustomFieldValidation) ?? null,
    visibility: f.visibility as CustomFieldVisibility,
    order: f.order,
    helpText: f.helpText,
    options: (f.options as unknown as CustomFieldOption[]) ?? null,
    isActive: f.isActive,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }));

  return <CustomFieldManagementClient initialFields={serializedFields} />;
}
