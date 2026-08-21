"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/server/services/auth.service";
import { AppError } from "@/server/errors/app-error";
import {
  completeSetupWizardService,
  getCollegeProfileService,
  getSetupWizardStatusService,
  updateCollegeProfileService,
} from "@/server/services/college-profile.service";
import { getUploadPresignedUrl } from "@/server/storage";
import { CollegeProfileInput } from "./schemas";

export async function getCollegeProfileAction() {
  try {
    const session = await getSession();
    const profile = await getCollegeProfileService(session?.user);
    return { success: true, data: profile };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return { success: false, error: "Failed to fetch college profile." };
  }
}

export async function updateCollegeProfileAction(input: CollegeProfileInput) {
  try {
    const session = await getSession();
    const profile = await updateCollegeProfileService(session?.user, input);
    revalidatePath("/settings/profile");
    revalidatePath("/setup-wizard");
    return { success: true, data: profile };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return { success: false, error: "Failed to update college profile." };
  }
}

export async function getSetupStatusAction() {
  try {
    const status = await getSetupWizardStatusService();
    return { success: true, data: status };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return { success: false, error: "Failed to fetch setup wizard status." };
  }
}

export async function getPresignedUrlAction(
  filename: string,
  contentType: string
) {
  try {
    const result = await getUploadPresignedUrl(filename, contentType);
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
      error: "Failed to generate presigned upload URL.",
    };
  }
}

export async function completeSetupWizardAction() {
  try {
    const session = await getSession();
    const profile = await completeSetupWizardService(session?.user);
    revalidatePath("/");
    revalidatePath("/dashboard");
    return { success: true, data: profile };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    const message =
      error instanceof Error
        ? error.message
        : "Failed to complete setup wizard.";
    return { success: false, error: message };
  }
}

export async function previewGeneratedPeriodsAction(input: {
  durationYears: number;
  pattern: "SEMESTER" | "YEAR";
}) {
  try {
    const session = await getSession();
    const { previewGeneratedPeriodsService } =
      await import("@/server/services/academic-period.service");
    const periods = await previewGeneratedPeriodsService(session?.user, input);
    return { success: true, data: periods };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    const message =
      error instanceof Error ? error.message : "Failed to preview periods.";
    return { success: false, error: message };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeSetupWizardTransactionAction(input: any) {
  try {
    const session = await getSession();
    const { executeSetupWizardTransactionService } =
      await import("@/server/services/academic-period.service");
    const result = await executeSetupWizardTransactionService(
      session?.user,
      input
    );
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/setup-wizard");
    revalidatePath("/programs");
    revalidatePath("/departments");
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
    const message =
      error instanceof Error
        ? error.message
        : "Failed to execute setup wizard.";
    return { success: false, error: message };
  }
}
