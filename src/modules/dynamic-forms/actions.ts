"use server";

import { requireAuth } from "@/server/services/auth.service";
import * as service from "@/server/services/dynamic-form.service";
import { listCustomFieldDefinitionsService } from "@/server/services/custom-field.service";
import {
  CreateFormDefinitionInput,
  UpdateFormDefinitionInput,
  CreateFormFieldInput,
  UpdateFormFieldInput,
} from "@/modules/dynamic-forms/types";

export async function getFormDefinitionAction(code: string) {
  const session = await requireAuth({ redirectTo: "/forms" });
  return service.getFormDefinitionByCodeService(session.user, code, true);
}

export async function listFormDefinitionsAction() {
  const session = await requireAuth({ redirectTo: "/forms" });
  return service.listFormDefinitionsService(session.user);
}

export async function createFormDefinitionAction(
  input: CreateFormDefinitionInput
) {
  const session = await requireAuth({ redirectTo: "/forms" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return service.createFormDefinitionService(session.user, input as any);
}

export async function updateFormDefinitionAction(
  id: string,
  input: UpdateFormDefinitionInput
) {
  const session = await requireAuth({ redirectTo: "/forms" });
  return service.updateFormDefinitionService(session.user, id, input);
}

export async function addFormFieldAction(
  formDefinitionId: string,
  input: CreateFormFieldInput
) {
  const session = await requireAuth({ redirectTo: "/forms" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return service.addFormFieldService(
    session.user,
    formDefinitionId,
    input as any
  );
}

export async function updateFormFieldAction(
  fieldId: string,
  input: UpdateFormFieldInput
) {
  const session = await requireAuth({ redirectTo: "/forms" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return service.updateFormFieldService(session.user, fieldId, input as any);
}

export async function deleteFormFieldAction(fieldId: string) {
  const session = await requireAuth({ redirectTo: "/forms" });
  return service.deleteFormFieldService(session.user, fieldId);
}

export async function reorderFormFieldsAction(
  formDefinitionId: string,
  fieldIds: string[]
) {
  const session = await requireAuth({ redirectTo: "/forms" });
  return service.reorderFormFieldsService(
    session.user,
    formDefinitionId,
    fieldIds
  );
}

export async function listCustomFieldsForEntityAction(entityType: string) {
  const session = await requireAuth({ redirectTo: "/forms" });
  return listCustomFieldDefinitionsService(session.user, entityType, false);
}
