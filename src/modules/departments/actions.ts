"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/server/services/auth.service";
import { AppError } from "@/server/errors/app-error";
import {
  createDepartmentService,
  deactivateDepartmentService,
  deleteDepartmentService,
  listDepartmentsService,
  listDepartmentsPaginatedService,
  exportDepartmentsCsvService,
  updateDepartmentService,
} from "@/server/services/department.service";
import {
  CreateDepartmentInput,
  DepartmentFilterInput,
  UpdateDepartmentInput,
} from "./schemas";
import type { DataTableConfig } from "@/components/tables/data-table.types";

export async function getDepartmentsAction(filters?: DepartmentFilterInput) {
  try {
    const session = await getSession();
    const departments = await listDepartmentsService(session?.user, filters);
    return { success: true, data: departments };
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
      error: "An unexpected error occurred while fetching departments.",
    };
  }
}

export async function getDepartmentsPaginatedAction(config: DataTableConfig) {
  try {
    const session = await getSession();
    const result = await listDepartmentsPaginatedService(session?.user, config);
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
      error: "An unexpected error occurred while fetching departments.",
    };
  }
}

export async function exportDepartmentsCsvAction(config: DataTableConfig) {
  try {
    const session = await getSession();
    // Fetch user permissions for CSV column filtering
    const { getUserPermissions } =
      await import("@/server/services/rbac.service");
    const userPermissions = session?.user?.id
      ? await getUserPermissions(session.user.id)
      : [];
    const csv = await exportDepartmentsCsvService(
      session?.user,
      config,
      userPermissions
    );
    return { success: true, data: csv };
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
      error: "An unexpected error occurred while exporting departments.",
    };
  }
}

export async function createDepartmentAction(input: CreateDepartmentInput) {
  try {
    const session = await getSession();
    const department = await createDepartmentService(session?.user, input);
    revalidatePath("/departments");
    return { success: true, data: department };
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
      error: "An unexpected error occurred while creating department.",
    };
  }
}

export async function updateDepartmentAction(
  id: string,
  input: UpdateDepartmentInput
) {
  try {
    const session = await getSession();
    const department = await updateDepartmentService(session?.user, id, input);
    revalidatePath("/departments");
    return { success: true, data: department };
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
      error: "An unexpected error occurred while updating department.",
    };
  }
}

export async function deactivateDepartmentAction(id: string) {
  try {
    const session = await getSession();
    const department = await deactivateDepartmentService(session?.user, id);
    revalidatePath("/departments");
    return { success: true, data: department };
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
      error: "An unexpected error occurred while deactivating department.",
    };
  }
}

export async function deleteDepartmentAction(id: string) {
  try {
    const session = await getSession();
    const result = await deleteDepartmentService(session?.user, id);
    revalidatePath("/departments");
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
      error: "An unexpected error occurred while deleting department.",
    };
  }
}
