"use 'server'";
"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/server/services/auth.service";
import { AppError } from "@/server/errors/app-error";
import {
  createAcademicPeriodService,
  deactivateAcademicPeriodService,
  deleteAcademicPeriodService,
  generateDefaultPeriodsService,
  listAcademicPeriodsService,
  reorderAcademicPeriodsService,
  updateAcademicPeriodService,
} from "@/server/services/academic-period.service";
import {
  createBatchService,
  deactivateBatchService,
  deleteBatchService,
  listBatchesService,
  updateBatchService,
} from "@/server/services/batch.service";
import {
  BatchFilterInput,
  CreateAcademicPeriodInput,
  CreateBatchInput,
  GeneratePeriodsInput,
  ReorderAcademicPeriodsInput,
  UpdateAcademicPeriodInput,
  UpdateBatchInput,
} from "./schemas";

// --- Academic Periods Actions ---

export async function getAcademicPeriodsAction(
  programId: string,
  includeInactive = false
) {
  try {
    const session = await getSession();
    const periods = await listAcademicPeriodsService(
      session?.user,
      programId,
      includeInactive
    );
    return { success: true, data: periods };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return { success: false, error: "Failed to fetch academic periods." };
  }
}

export async function createAcademicPeriodAction(
  input: CreateAcademicPeriodInput
) {
  try {
    const session = await getSession();
    const period = await createAcademicPeriodService(session?.user, input);
    revalidatePath("/academic-structure");
    return { success: true, data: period };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return { success: false, error: "Failed to create academic period." };
  }
}

export async function generateDefaultPeriodsAction(
  input: GeneratePeriodsInput
) {
  try {
    const session = await getSession();
    const periods = await generateDefaultPeriodsService(session?.user, input);
    revalidatePath("/academic-structure");
    return { success: true, data: periods };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return { success: false, error: "Failed to generate academic periods." };
  }
}

export async function updateAcademicPeriodAction(
  id: string,
  input: UpdateAcademicPeriodInput
) {
  try {
    const session = await getSession();
    const period = await updateAcademicPeriodService(session?.user, id, input);
    revalidatePath("/academic-structure");
    return { success: true, data: period };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return { success: false, error: "Failed to update academic period." };
  }
}

export async function reorderAcademicPeriodsAction(
  input: ReorderAcademicPeriodsInput
) {
  try {
    const session = await getSession();
    const periods = await reorderAcademicPeriodsService(session?.user, input);
    revalidatePath("/academic-structure");
    return { success: true, data: periods };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return { success: false, error: "Failed to reorder academic periods." };
  }
}

export async function deactivateAcademicPeriodAction(id: string) {
  try {
    const session = await getSession();
    const period = await deactivateAcademicPeriodService(session?.user, id);
    revalidatePath("/academic-structure");
    return { success: true, data: period };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return { success: false, error: "Failed to deactivate academic period." };
  }
}

export async function deleteAcademicPeriodAction(id: string) {
  try {
    const session = await getSession();
    const result = await deleteAcademicPeriodService(session?.user, id);
    revalidatePath("/academic-structure");
    return { success: true, data: result };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return { success: false, error: "Failed to delete academic period." };
  }
}

// --- Batches Actions ---

export async function getBatchesAction(filters?: BatchFilterInput) {
  try {
    const session = await getSession();
    const batches = await listBatchesService(session?.user, filters);
    return { success: true, data: batches };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return { success: false, error: "Failed to fetch batches." };
  }
}

export async function createBatchAction(input: CreateBatchInput) {
  try {
    const session = await getSession();
    const batch = await createBatchService(session?.user, input);
    revalidatePath("/academic-structure");
    return { success: true, data: batch };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return { success: false, error: "Failed to create batch." };
  }
}

export async function updateBatchAction(id: string, input: UpdateBatchInput) {
  try {
    const session = await getSession();
    const batch = await updateBatchService(session?.user, id, input);
    revalidatePath("/academic-structure");
    return { success: true, data: batch };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return { success: false, error: "Failed to update batch." };
  }
}

export async function deactivateBatchAction(id: string) {
  try {
    const session = await getSession();
    const batch = await deactivateBatchService(session?.user, id);
    revalidatePath("/academic-structure");
    return { success: true, data: batch };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return { success: false, error: "Failed to deactivate batch." };
  }
}

export async function deleteBatchAction(id: string) {
  try {
    const session = await getSession();
    const result = await deleteBatchService(session?.user, id);
    revalidatePath("/academic-structure");
    return { success: true, data: result };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return { success: false, error: "Failed to delete batch." };
  }
}
