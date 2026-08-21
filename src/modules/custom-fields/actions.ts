"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/server/services/auth.service";
import { AppError } from "@/server/errors/app-error";
import {
  listCustomFieldDefinitionsService,
  createCustomFieldDefinitionService,
  updateCustomFieldDefinitionService,
  toggleCustomFieldStatusService,
  deleteCustomFieldDefinitionService,
  reorderCustomFieldDefinitionsService,
} from "@/server/services/custom-field.service";
import {
  CreateCustomFieldDefinitionInput,
  UpdateCustomFieldDefinitionInput,
} from "./schemas";

export async function getCustomFieldsAction(
  entityType?: string,
  includeInactive: boolean = true
) {
  try {
    const session = await getSession();
    const fields = await listCustomFieldDefinitionsService(
      session?.user ?? null,
      entityType,
      includeInactive
    );
    return { success: true, data: fields };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return {
      success: false,
      error: "An unexpected error occurred while fetching custom fields.",
    };
  }
}

export async function createCustomFieldAction(
  input: CreateCustomFieldDefinitionInput
) {
  try {
    const session = await getSession();
    const field = await createCustomFieldDefinitionService(
      session?.user ?? null,
      input
    );
    revalidatePath("/admin/custom-fields");
    return { success: true, data: field };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return {
      success: false,
      error: "An unexpected error occurred while creating custom field.",
    };
  }
}

export async function updateCustomFieldAction(
  id: string,
  input: UpdateCustomFieldDefinitionInput
) {
  try {
    const session = await getSession();
    const field = await updateCustomFieldDefinitionService(
      session?.user ?? null,
      id,
      input
    );
    revalidatePath("/admin/custom-fields");
    return { success: true, data: field };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return {
      success: false,
      error: "An unexpected error occurred while updating custom field.",
    };
  }
}

export async function toggleCustomFieldStatusAction(
  id: string,
  isActive: boolean
) {
  try {
    const session = await getSession();
    const field = await toggleCustomFieldStatusService(
      session?.user ?? null,
      id,
      isActive
    );
    revalidatePath("/admin/custom-fields");
    return { success: true, data: field };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return {
      success: false,
      error: "An unexpected error occurred while toggling custom field status.",
    };
  }
}

export async function deleteCustomFieldAction(id: string) {
  try {
    const session = await getSession();
    const deleted = await deleteCustomFieldDefinitionService(
      session?.user ?? null,
      id
    );
    revalidatePath("/admin/custom-fields");
    return { success: true, data: deleted };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return {
      success: false,
      error: "An unexpected error occurred while deleting custom field.",
    };
  }
}

export async function reorderCustomFieldsAction(
  entityType: string,
  orderedIds: string[]
) {
  try {
    const session = await getSession();
    const result = await reorderCustomFieldDefinitionsService(
      session?.user ?? null,
      entityType,
      orderedIds
    );
    revalidatePath("/admin/custom-fields");
    return { success: true, data: result };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return {
      success: false,
      error: "An unexpected error occurred while reordering custom fields.",
    };
  }
}
