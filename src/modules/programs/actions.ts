"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/server/services/auth.service";
import { AppError } from "@/server/errors/app-error";
import {
  createProgramService,
  deactivateProgramService,
  deleteProgramService,
  listProgramsService,
  listProgramsPaginatedService,
  exportProgramsCsvService,
  updateProgramService,
} from "@/server/services/program.service";
import {
  CreateProgramInput,
  ProgramFilterInput,
  UpdateProgramInput,
} from "./schemas";
import type { DataTableConfig } from "@/components/tables/data-table.types";

export async function getProgramsAction(filters?: ProgramFilterInput) {
  try {
    const session = await getSession();
    const programs = await listProgramsService(session?.user, filters);
    return { success: true, data: programs };
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
      error: "An unexpected error occurred while fetching programs.",
    };
  }
}

export async function getProgramsPaginatedAction(config: DataTableConfig) {
  try {
    const session = await getSession();
    const result = await listProgramsPaginatedService(session?.user, config);
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
      error: "An unexpected error occurred while fetching programs.",
    };
  }
}

export async function exportProgramsCsvAction(config: DataTableConfig) {
  try {
    const session = await getSession();
    const { getUserPermissions } =
      await import("@/server/services/rbac.service");
    const userPermissions = session?.user?.id
      ? await getUserPermissions(session.user.id)
      : [];
    const csv = await exportProgramsCsvService(
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
      error: "An unexpected error occurred while exporting programs.",
    };
  }
}

export async function createProgramAction(input: CreateProgramInput) {
  try {
    const session = await getSession();
    const program = await createProgramService(session?.user, input);
    revalidatePath("/programs");
    return { success: true, data: program };
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
      error: "An unexpected error occurred while creating program.",
    };
  }
}

export async function updateProgramAction(
  id: string,
  input: UpdateProgramInput
) {
  try {
    const session = await getSession();
    const program = await updateProgramService(session?.user, id, input);
    revalidatePath("/programs");
    return { success: true, data: program };
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
      error: "An unexpected error occurred while updating program.",
    };
  }
}

export async function deactivateProgramAction(id: string) {
  try {
    const session = await getSession();
    const program = await deactivateProgramService(session?.user, id);
    revalidatePath("/programs");
    return { success: true, data: program };
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
      error: "An unexpected error occurred while deactivating program.",
    };
  }
}

export async function deleteProgramAction(id: string) {
  try {
    const session = await getSession();
    const result = await deleteProgramService(session?.user, id);
    revalidatePath("/programs");
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
      error: "An unexpected error occurred while deleting program.",
    };
  }
}
