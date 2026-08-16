"use 'server'";
"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/server/services/auth.service";
import { AppError } from "@/server/errors/app-error";
import {
  createProgramService,
  deactivateProgramService,
  deleteProgramService,
  listProgramsService,
  updateProgramService,
} from "@/server/services/program.service";
import {
  CreateProgramInput,
  ProgramFilterInput,
  UpdateProgramInput,
} from "./schemas";

export async function getProgramsAction(filters?: ProgramFilterInput) {
  try {
    const session = await getSession();
    const programs = await listProgramsService(session?.user, filters);
    return { success: true, data: programs };
  } catch (error: any) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, statusCode: error.statusCode };
    }
    return { success: false, error: "An unexpected error occurred while fetching programs." };
  }
}

export async function createProgramAction(input: CreateProgramInput) {
  try {
    const session = await getSession();
    const program = await createProgramService(session?.user, input);
    revalidatePath("/programs");
    return { success: true, data: program };
  } catch (error: any) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, statusCode: error.statusCode };
    }
    return { success: false, error: "An unexpected error occurred while creating program." };
  }
}

export async function updateProgramAction(id: string, input: UpdateProgramInput) {
  try {
    const session = await getSession();
    const program = await updateProgramService(session?.user, id, input);
    revalidatePath("/programs");
    return { success: true, data: program };
  } catch (error: any) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, statusCode: error.statusCode };
    }
    return { success: false, error: "An unexpected error occurred while updating program." };
  }
}

export async function deactivateProgramAction(id: string) {
  try {
    const session = await getSession();
    const program = await deactivateProgramService(session?.user, id);
    revalidatePath("/programs");
    return { success: true, data: program };
  } catch (error: any) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, statusCode: error.statusCode };
    }
    return { success: false, error: "An unexpected error occurred while deactivating program." };
  }
}

export async function deleteProgramAction(id: string) {
  try {
    const session = await getSession();
    const result = await deleteProgramService(session?.user, id);
    revalidatePath("/programs");
    return { success: true, data: result };
  } catch (error: any) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, statusCode: error.statusCode };
    }
    return { success: false, error: "An unexpected error occurred while deleting program." };
  }
}
