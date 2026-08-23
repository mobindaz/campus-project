"use server";

import { getSession } from "@/server/services/auth.service";
import {
  AppError,
  UnauthorizedError,
  ValidationError,
} from "@/server/errors/app-error";
import {
  validateExcelFile,
  getExcelWorkbookInfo,
  parseExcelSheet,
} from "@/server/services/excel-import.service";
import {
  excelParseOptionsSchema,
  fileValidationOptionsSchema,
} from "./schemas";
import type {
  ExcelParseOptions,
  ExcelParsedData,
  ExcelWorkbookInfo,
  FileValidationOptions,
} from "./types";

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

/**
 * Server action to inspect an uploaded spreadsheet file and retrieve sheet names/dimensions.
 */
export async function inspectExcelFileAction(
  formData: FormData,
  validationOptions?: FileValidationOptions
): Promise<ActionResult<ExcelWorkbookInfo>> {
  try {
    const session = await getSession();
    if (!session?.user) {
      throw new UnauthorizedError(
        "Authentication required to inspect spreadsheets."
      );
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      throw new ValidationError("No valid file provided in upload form.");
    }

    const validatedOptions = validationOptions
      ? fileValidationOptionsSchema.parse(validationOptions)
      : undefined;

    const arrayBuffer = await file.arrayBuffer();
    validateExcelFile(arrayBuffer, file.name, validatedOptions);

    const workbookInfo = getExcelWorkbookInfo(arrayBuffer);
    return { success: true, data: workbookInfo };
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
      error: "An unexpected error occurred while inspecting the spreadsheet.",
    };
  }
}

/**
 * Server action to upload and parse an Excel/CSV spreadsheet into structured headers and raw rows.
 */
export async function parseExcelFileAction(
  formData: FormData,
  parseOptions?: ExcelParseOptions,
  validationOptions?: FileValidationOptions
): Promise<ActionResult<ExcelParsedData>> {
  try {
    const session = await getSession();
    if (!session?.user) {
      throw new UnauthorizedError(
        "Authentication required to parse spreadsheets."
      );
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      throw new ValidationError("No valid file provided in upload form.");
    }

    const validatedValidationOpts = validationOptions
      ? fileValidationOptionsSchema.parse(validationOptions)
      : undefined;

    const validatedParseOpts = parseOptions
      ? excelParseOptionsSchema.parse(parseOptions)
      : undefined;

    const arrayBuffer = await file.arrayBuffer();
    validateExcelFile(arrayBuffer, file.name, validatedValidationOpts);

    const parsedData = parseExcelSheet(arrayBuffer, validatedParseOpts);
    return { success: true, data: parsedData };
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
      error: "An unexpected error occurred while parsing the spreadsheet.",
    };
  }
}
