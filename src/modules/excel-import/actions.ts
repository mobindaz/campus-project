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
  suggestColumnMappings,
  saveMappingTemplateService,
  listMappingTemplatesService,
  getMappingTemplateService,
  deleteMappingTemplateService,
} from "@/server/services/column-mapping.service";
import {
  analyzeAndResolveFieldValues,
  saveValueMappingsService,
  listValueMappingsService,
  deleteValueMappingService,
} from "@/server/services/value-mapping.service";
import { validateStudentImportRows } from "@/server/services/import-validation.service";
import {
  executeStudentImportService,
  listImportHistoryService,
} from "@/server/services/import-execution.service";
import {
  excelParseOptionsSchema,
  fileValidationOptionsSchema,
  saveMappingTemplateSchema,
  getColumnMappingSuggestionsSchema,
  saveValueMappingsSchema,
  resolveFieldValuesSchema,
  validateImportRowsSchema,
  executeImportSchema,
  listImportHistorySchema,
} from "./schemas";
import type {
  ExcelParseOptions,
  ExcelParsedData,
  ExcelWorkbookInfo,
  FileValidationOptions,
  ColumnMappingResult,
  ImportMappingTemplate,
  SaveMappingTemplateInput,
  SaveValueMappingItemInput,
  ValueMappingItem,
  ValueResolutionResult,
  ImportValidationResult,
  ExecuteImportInput,
  ImportExecutionResult,
  ImportHistoryRecord,
  MatchingStrategy,
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

// ─── Column Mapping Server Actions (Spec §14–15) ─────────────────────────────

/**
 * Server action to suggest column mappings for a list of source headers.
 */
export async function suggestColumnMappingsAction(
  sourceHeaders: string[],
  entityType: string,
  templateId?: string
): Promise<ActionResult<ColumnMappingResult>> {
  try {
    const session = await getSession();
    if (!session?.user) {
      throw new UnauthorizedError(
        "Authentication required to map spreadsheet columns."
      );
    }

    const validated = getColumnMappingSuggestionsSchema.parse({
      sourceHeaders,
      entityType,
      templateId,
    });

    const result = await suggestColumnMappings(
      validated.sourceHeaders,
      validated.entityType,
      validated.templateId
    );

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
      error:
        "An unexpected error occurred while generating column mapping suggestions.",
    };
  }
}

/**
 * Server action to save a confirmed column mapping template.
 */
export async function saveMappingTemplateAction(
  input: SaveMappingTemplateInput
): Promise<ActionResult<ImportMappingTemplate>> {
  try {
    const session = await getSession();
    if (!session?.user) {
      throw new UnauthorizedError(
        "Authentication required to save mapping templates."
      );
    }

    const validated = saveMappingTemplateSchema.parse(input);
    const template = await saveMappingTemplateService(session.user, validated);

    return { success: true, data: template };
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
      error: "An unexpected error occurred while saving mapping template.",
    };
  }
}

/**
 * Server action to list all mapping templates for an entity type.
 */
export async function listMappingTemplatesAction(
  entityType: string
): Promise<ActionResult<ImportMappingTemplate[]>> {
  try {
    const session = await getSession();
    if (!session?.user) {
      throw new UnauthorizedError(
        "Authentication required to list mapping templates."
      );
    }

    const templates = await listMappingTemplatesService(
      session.user,
      entityType
    );
    return { success: true, data: templates };
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
      error: "An unexpected error occurred while listing mapping templates.",
    };
  }
}

/**
 * Server action to get a mapping template by ID.
 */
export async function getMappingTemplateAction(
  id: string
): Promise<ActionResult<ImportMappingTemplate>> {
  try {
    const session = await getSession();
    if (!session?.user) {
      throw new UnauthorizedError(
        "Authentication required to fetch mapping template."
      );
    }

    const template = await getMappingTemplateService(session.user, id);
    return { success: true, data: template };
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
      error: "An unexpected error occurred while fetching mapping template.",
    };
  }
}

/**
 * Server action to delete a mapping template by ID.
 */
export async function deleteMappingTemplateAction(
  id: string
): Promise<ActionResult<{ success: boolean; id: string }>> {
  try {
    const session = await getSession();
    if (!session?.user) {
      throw new UnauthorizedError(
        "Authentication required to delete mapping template."
      );
    }

    const result = await deleteMappingTemplateService(session.user, id);
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
      error: "An unexpected error occurred while deleting mapping template.",
    };
  }
}

// ─── Value Mapping Server Actions (Spec §18) ─────────────────────────────────

/**
 * Server action to analyze and resolve spreadsheet field values (exact DB match, saved aliases, or heuristic suggestions).
 */
export async function resolveFieldValuesAction(
  rows: Array<Record<string, unknown>>,
  fieldKeys: string[],
  entityType: string
): Promise<ActionResult<ValueResolutionResult>> {
  try {
    const session = await getSession();
    if (!session?.user) {
      throw new UnauthorizedError(
        "Authentication required to resolve import values."
      );
    }

    const validated = resolveFieldValuesSchema.parse({
      rows,
      fieldKeys,
      entityType,
    });

    const result = await analyzeAndResolveFieldValues(
      validated.rows,
      validated.fieldKeys,
      validated.entityType
    );

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
      error: "An unexpected error occurred while resolving field values.",
    };
  }
}

/**
 * Server action to persist confirmed value mapping aliases into the database.
 */
export async function saveValueMappingsAction(
  mappings: SaveValueMappingItemInput[]
): Promise<ActionResult<ValueMappingItem[]>> {
  try {
    const session = await getSession();
    if (!session?.user) {
      throw new UnauthorizedError(
        "Authentication required to save value mapping aliases."
      );
    }

    const validated = saveValueMappingsSchema.parse({ mappings });
    const result = await saveValueMappingsService(
      session.user,
      validated.mappings
    );

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
      error: "An unexpected error occurred while saving value mappings.",
    };
  }
}

/**
 * Server action to list persistent value mappings.
 */
export async function listValueMappingsAction(
  entityType: string,
  fieldKey?: string
): Promise<ActionResult<ValueMappingItem[]>> {
  try {
    const session = await getSession();
    if (!session?.user) {
      throw new UnauthorizedError(
        "Authentication required to list value mappings."
      );
    }

    const list = await listValueMappingsService(
      session.user,
      entityType,
      fieldKey
    );
    return { success: true, data: list };
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
      error: "An unexpected error occurred while listing value mappings.",
    };
  }
}

/**
 * Server action to delete a value mapping alias by ID.
 */
export async function deleteValueMappingAction(
  id: string
): Promise<ActionResult<{ success: boolean; id: string }>> {
  try {
    const session = await getSession();
    if (!session?.user) {
      throw new UnauthorizedError(
        "Authentication required to delete value mapping."
      );
    }

    const result = await deleteValueMappingService(session.user, id);
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
      error: "An unexpected error occurred while deleting value mapping.",
    };
  }
}

// ─── Row Validation & Chunked Execution Actions (Spec §19–20 & Correction #9) ─

/**
 * Server action to run row-level validation and detect duplicates/actions.
 */
export async function validateImportRowsAction(
  rows: Array<Record<string, unknown>>,
  entityType: string,
  matchingStrategy: MatchingStrategy = "registerNumber"
): Promise<ActionResult<ImportValidationResult>> {
  try {
    const session = await getSession();
    if (!session?.user) {
      throw new UnauthorizedError(
        "Authentication required to validate import rows."
      );
    }

    const validated = validateImportRowsSchema.parse({
      rows,
      entityType,
      matchingStrategy,
    });

    const result = await validateStudentImportRows(
      validated.rows,
      validated.matchingStrategy as MatchingStrategy
    );

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
      error: "An unexpected error occurred while validating import rows.",
    };
  }
}

/**
 * Server action to execute chunked upsert with row-level error isolation.
 */
export async function executeImportAction(
  input: ExecuteImportInput
): Promise<ActionResult<ImportExecutionResult>> {
  try {
    const session = await getSession();
    if (!session?.user) {
      throw new UnauthorizedError("Authentication required to execute import.");
    }

    const validated = executeImportSchema.parse(input);
    const result = await executeStudentImportService(
      session.user,
      validated as ExecuteImportInput
    );

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
      error: "An unexpected error occurred while executing import.",
    };
  }
}

/**
 * Server action to list past import history records.
 */
export async function listImportHistoryAction(
  entityType?: string,
  limit?: number
): Promise<ActionResult<ImportHistoryRecord[]>> {
  try {
    const session = await getSession();
    if (!session?.user) {
      throw new UnauthorizedError(
        "Authentication required to view import history."
      );
    }

    const validated = listImportHistorySchema.parse({ entityType, limit });
    const list = await listImportHistoryService(
      session.user,
      validated.entityType,
      validated.limit
    );

    return { success: true, data: list };
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
      error: "An unexpected error occurred while listing import history.",
    };
  }
}
