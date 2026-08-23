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
