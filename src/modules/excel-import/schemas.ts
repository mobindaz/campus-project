import { z } from "zod";

export const excelParseOptionsSchema = z.object({
  sheetName: z.string().trim().min(1).optional(),
  sheetIndex: z.number().int().min(0).optional(),
  headerRowIndex: z.number().int().min(0).optional(),
  autoDetectHeader: z.boolean().default(true).optional(),
  headerSearchDepth: z.number().int().min(1).max(100).default(20).optional(),
  maxRows: z.number().int().positive().optional(),
  skipEmptyRows: z.boolean().default(true).optional(),
  trimValues: z.boolean().default(true).optional(),
  formatDates: z.boolean().default(true).optional(),
});

export type ExcelParseOptionsInput = z.infer<typeof excelParseOptionsSchema>;

export const fileValidationOptionsSchema = z.object({
  maxSizeBytes: z
    .number()
    .int()
    .positive()
    .default(10 * 1024 * 1024)
    .optional(),
  allowedExtensions: z
    .array(z.string())
    .default([".xlsx", ".xls", ".csv"])
    .optional(),
  allowedMimeTypes: z.array(z.string()).optional(),
});

export type FileValidationOptionsInput = z.infer<
  typeof fileValidationOptionsSchema
>;

export const inspectExcelFileSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
  contentType: z.string().optional(),
});

export type InspectExcelFileInput = z.infer<typeof inspectExcelFileSchema>;

// ─── Column Mapping Schemas (Spec §14–15) ────────────────────────────────────

export const saveMappingTemplateSchema = z.object({
  name: z.string().trim().min(1, "Template name is required").max(100),
  entityType: z.string().trim().min(1, "Entity type is required"),
  mapping: z
    .record(z.string(), z.string())
    .refine(
      (map) => Object.keys(map).length > 0,
      "Mapping must contain at least one column entry."
    ),
  isDefault: z.boolean().default(false),
  description: z.string().trim().max(500).optional().nullable(),
});

export type SaveMappingTemplateInput = z.infer<
  typeof saveMappingTemplateSchema
>;

export const getColumnMappingSuggestionsSchema = z.object({
  sourceHeaders: z.array(z.string()),
  entityType: z.string().trim().min(1),
  templateId: z.string().optional(),
});

export type GetColumnMappingSuggestionsInput = z.infer<
  typeof getColumnMappingSuggestionsSchema
>;

export const confirmColumnMappingSchema = z.object({
  entityType: z.string().trim().min(1),
  mapping: z.record(z.string(), z.string()),
  saveAsTemplate: z.boolean().optional(),
  templateName: z.string().trim().min(1).optional(),
});

export type ConfirmColumnMappingInput = z.infer<
  typeof confirmColumnMappingSchema
>;

// ─── Value Mapping Schemas (Spec §18) ────────────────────────────────────────

export const saveValueMappingItemSchema = z.object({
  entityType: z.string().trim().min(1, "Entity type is required"),
  fieldKey: z.string().trim().min(1, "Field key is required"),
  sourceValue: z.string().trim().min(1, "Source value is required"),
  targetId: z.string().trim().min(1, "Target ID is required"),
  targetLabel: z.string().trim().min(1, "Target label is required"),
});

export type SaveValueMappingItemInput = z.infer<
  typeof saveValueMappingItemSchema
>;

export const saveValueMappingsSchema = z.object({
  mappings: z.array(saveValueMappingItemSchema),
});

export type SaveValueMappingsInput = z.infer<typeof saveValueMappingsSchema>;

export const resolveFieldValuesSchema = z.object({
  entityType: z.string().trim().min(1),
  fieldKeys: z.array(z.string().trim().min(1)),
  rows: z.array(z.record(z.string(), z.unknown())),
});

export type ResolveFieldValuesInput = z.infer<typeof resolveFieldValuesSchema>;
