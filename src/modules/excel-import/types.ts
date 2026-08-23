/**
 * Generic Excel Import Engine Types
 * =================================
 * Purely entity-agnostic definitions for workbook parsing, sheet metadata inspection,
 * header detection, raw-row extraction, and chunked batch processing.
 */

export interface ExcelHeader {
  /** 0-based column index in the sheet */
  index: number;
  /** Unique normalized key safe for object properties (e.g. 'first_name', 'email_1') */
  key: string;
  /** Cleaned display label for the column header */
  label: string;
  /** Exact raw string from the original cell */
  originalName: string;
}

export interface ExcelSheetInfo {
  name: string;
  index: number;
  rowCount: number;
  columnCount: number;
  isEmpty: boolean;
}

export interface ExcelWorkbookInfo {
  sheetNames: string[];
  sheets: ExcelSheetInfo[];
  totalSheets: number;
}

export interface ExcelRawRow {
  /** 1-based original row number in the physical Excel sheet for human-friendly error reporting */
  __rowNumber: number;
  [key: string]: unknown;
}

export interface ExcelParsedData<T = ExcelRawRow> {
  headers: ExcelHeader[];
  rows: T[];
  totalRows: number;
  totalColumns: number;
  sheetNames: string[];
  selectedSheet: string;
  headerRowIndex: number;
}

export interface ExcelParseOptions {
  /** Target sheet name (takes precedence over sheetIndex) */
  sheetName?: string;
  /** 0-based sheet index (defaults to 0 if sheetName not specified) */
  sheetIndex?: number;
  /** Explicit 0-based row index to use as the header row */
  headerRowIndex?: number;
  /** When true and headerRowIndex is omitted, searches the first N rows for the best header row (default: true) */
  autoDetectHeader?: boolean;
  /** Maximum number of rows to search when auto-detecting header row (default: 20) */
  headerSearchDepth?: number;
  /** Optional cap on extracted data rows */
  maxRows?: number;
  /** Skip completely empty rows (default: true) */
  skipEmptyRows?: boolean;
  /** Trim whitespace from string cell values (default: true) */
  trimValues?: boolean;
  /** When true, converts Excel date values to ISO format strings YYYY-MM-DD or full ISO (default: true) */
  formatDates?: boolean;
}

export interface FileValidationOptions {
  /** Maximum allowed file size in bytes (default: 10MB) */
  maxSizeBytes?: number;
  /** Allowed file extensions (e.g. ['.xlsx', '.xls', '.csv']) */
  allowedExtensions?: string[];
  /** Allowed MIME types */
  allowedMimeTypes?: string[];
}

export interface FileValidationResult {
  valid: boolean;
  fileName: string;
  sizeBytes: number;
  mimeType?: string;
  extension: string;
  error?: string;
}

export interface BatchItemError {
  index: number;
  rowNumber?: number;
  error: string;
  data?: unknown;
}

export interface BatchProcessingItemResult<T> {
  item: T;
  index: number;
  success: boolean;
  error?: string;
  data?: unknown;
}

export interface BatchProcessingResult<T> {
  totalItems: number;
  processedItems: number;
  successCount: number;
  failureCount: number;
  results: BatchProcessingItemResult<T>[];
  errors: BatchItemError[];
}
