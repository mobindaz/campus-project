"use 'server'";
"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/server/services/auth.service";
import { AppError } from "@/server/errors/app-error";
import {
  completeSetupWizardService,
  getCollegeProfileService,
  getSetupWizardStatusService,
  seedDemoDataService,
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

export async function seedDemoDataAction() {
  try {
    const session = await getSession();
    const profile = await seedDemoDataService(session?.user);
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
      error instanceof Error ? error.message : "Failed to seed demo data.";
    return { success: false, error: message };
  }
}
