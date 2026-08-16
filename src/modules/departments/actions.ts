"use 'server'";
"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/server/services/auth.service";
import { AppError } from "@/server/errors/app-error";
import {
  createDepartmentService,
  deactivateDepartmentService,
  deleteDepartmentService,
  listDepartmentsService,
  updateDepartmentService,
} from "@/server/services/department.service";
import {
  CreateDepartmentInput,
  DepartmentFilterInput,
  UpdateDepartmentInput,
} from "./schemas";

export async function getDepartmentsAction(filters?: DepartmentFilterInput) {
  try {
    const session = await getSession();
    const departments = await listDepartmentsService(session?.user, filters);
    return { success: true, data: departments };
  } catch (error: any) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, statusCode: error.statusCode };
    }
    return { success: false, error: "An unexpected error occurred while fetching departments." };
  }
}

export async function createDepartmentAction(input: CreateDepartmentInput) {
  try {
    const session = await getSession();
    const department = await createDepartmentService(session?.user, input);
    revalidatePath("/departments");
    return { success: true, data: department };
  } catch (error: any) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, statusCode: error.statusCode };
    }
    return { success: false, error: "An unexpected error occurred while creating department." };
  }
}

export async function updateDepartmentAction(id: string, input: UpdateDepartmentInput) {
  try {
    const session = await getSession();
    const department = await updateDepartmentService(session?.user, id, input);
    revalidatePath("/departments");
    return { success: true, data: department };
  } catch (error: any) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, statusCode: error.statusCode };
    }
    return { success: false, error: "An unexpected error occurred while updating department." };
  }
}

export async function deactivateDepartmentAction(id: string) {
  try {
    const session = await getSession();
    const department = await deactivateDepartmentService(session?.user, id);
    revalidatePath("/departments");
    return { success: true, data: department };
  } catch (error: any) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, statusCode: error.statusCode };
    }
    return { success: false, error: "An unexpected error occurred while deactivating department." };
  }
}

export async function deleteDepartmentAction(id: string) {
  try {
    const session = await getSession();
    const result = await deleteDepartmentService(session?.user, id);
    revalidatePath("/departments");
    return { success: true, data: result };
  } catch (error: any) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, statusCode: error.statusCode };
    }
    return { success: false, error: "An unexpected error occurred while deleting department." };
  }
}
