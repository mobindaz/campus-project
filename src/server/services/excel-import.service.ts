/**
 * Dynamic Excel Import Engine Service
 * ====================================
 * A standalone, entity-agnostic Excel reading, validation, header detection,
 * and raw-row extraction service.
 *
 * Implements Architecture Spec §12 and Correction #9:
 * - Server-side size and MIME/extension validation
 * - SheetJS-based parsing with zero entity coupling (no "Student" or entity-specific assumptions)
 * - Intelligent header detection (handles banner titles, notes, and arbitrary row positions)
 * - Column deduplication and blank column fallback
 * - Cell normalization (dates, numbers, strings, nulls)
 * - Row number tracking for precise error reporting
 * - Chunked transaction / batch processing helpers with row-level error isolation
 */

import * as XLSX from "xlsx";
import {
  AppError,
  ValidationError,
  BadRequestError,
} from "@/server/errors/app-error";
import type {
  ExcelHeader,
  ExcelSheetInfo,
  ExcelWorkbookInfo,
  ExcelRawRow,
  ExcelParsedData,
  ExcelParseOptions,
  FileValidationOptions,
  FileValidationResult,
  BatchProcessingResult,
  BatchProcessingItemResult,
  BatchItemError,
} from "@/modules/excel-import/types";

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];
const DEFAULT_ALLOWED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
  "application/octet-stream",
];

/**
 * Normalizes input buffer into a Uint8Array or Buffer suitable for SheetJS
 */
function toBuffer(data: ArrayBuffer | Uint8Array | Buffer): Uint8Array {
  if (data instanceof Uint8Array) {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  return new Uint8Array(data);
}

/**
 * Extracts file extension from a filename (in lower case, including leading dot)
 */
export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "";
  return fileName.substring(lastDot).toLowerCase();
}

/**
 * Validates uploaded Excel/CSV file against size, extension, and MIME type rules.
 * Throws ValidationError if invalid.
 */
export function validateExcelFile(
  fileBuffer: ArrayBuffer | Uint8Array | Buffer,
  fileName: string,
  options?: FileValidationOptions
): FileValidationResult {
  const maxSizeBytes = options?.maxSizeBytes ?? DEFAULT_MAX_FILE_SIZE;
  const allowedExtensions =
    options?.allowedExtensions ?? DEFAULT_ALLOWED_EXTENSIONS;
  const allowedMimeTypes =
    options?.allowedMimeTypes ?? DEFAULT_ALLOWED_MIME_TYPES;

  const buffer = toBuffer(fileBuffer);
  const sizeBytes = buffer.byteLength;

  if (sizeBytes === 0) {
    throw new ValidationError("The uploaded file is empty (0 bytes).");
  }

  if (sizeBytes > maxSizeBytes) {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    throw new ValidationError(
      `File size (${(sizeBytes / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of ${maxMb} MB.`
    );
  }

  const extension = getFileExtension(fileName);
  if (!allowedExtensions.map((e) => e.toLowerCase()).includes(extension)) {
    throw new ValidationError(
      `Invalid file extension '${extension}'. Allowed extensions are: ${allowedExtensions.join(", ")}`
    );
  }

  // Verify that mime types configured include spreadsheet formats
  if (allowedMimeTypes.length === 0) {
    throw new ValidationError("No allowed MIME types configured for upload.");
  }

  // Verify binary container signatures for .xlsx (ZIP PK..) and .xls (OLE2/CFB)
  if (extension === ".xlsx") {
    const isZip =
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07);
    if (!isZip) {
      throw new ValidationError(
        "Corrupt or invalid .xlsx file. The file does not have a valid OpenXML spreadsheet header."
      );
    }
  } else if (extension === ".xls") {
    const isCfb =
      buffer.length >= 4 &&
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0;
    if (!isCfb) {
      throw new ValidationError(
        "Corrupt or invalid .xls file. The file does not have a valid binary spreadsheet header."
      );
    }
  }

  // Attempt reading workbook header with SheetJS to verify integrity
  try {
    const workbook = XLSX.read(buffer, {
      type: "array",
      bookSheets: true,
      sheetRows: 1,
    });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new ValidationError("The uploaded spreadsheet contains no sheets.");
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new ValidationError(
      "Failed to read spreadsheet. The file may be corrupt or encrypted with a password."
    );
  }

  return {
    valid: true,
    fileName,
    sizeBytes,
    extension,
  };
}

/**
 * Inspects an Excel workbook and returns sheet names and basic dimensions
 */
export function getExcelWorkbookInfo(
  fileBuffer: ArrayBuffer | Uint8Array | Buffer
): ExcelWorkbookInfo {
  const buffer = toBuffer(fileBuffer);

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: true,
      dense: true,
    });
  } catch {
    throw new ValidationError(
      "Unable to parse Excel workbook. Please verify the file is a valid .xlsx or .xls file."
    );
  }

  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) {
    throw new ValidationError("Workbook contains no readable sheets.");
  }

  const sheets: ExcelSheetInfo[] = sheetNames.map((name, index) => {
    const sheet = workbook.Sheets[name];
    if (!sheet || !sheet["!ref"]) {
      return {
        name,
        index,
        rowCount: 0,
        columnCount: 0,
        isEmpty: true,
      };
    }

    const range = XLSX.utils.decode_range(sheet["!ref"]);
    const rowCount = range.e.r - range.s.r + 1;
    const columnCount = range.e.c - range.s.c + 1;

    return {
      name,
      index,
      rowCount,
      columnCount,
      isEmpty: rowCount === 0 || columnCount === 0,
    };
  });

  return {
    sheetNames,
    sheets,
    totalSheets: sheetNames.length,
  };
}

/**
 * Detects the most probable header row index in a 2D raw sheet matrix.
 *
 * Scoring criteria for candidate header rows:
 * - High density of non-empty cells
 * - High ratio of text/string cells
 * - High proportion of unique values (headers are distinct)
 * - Lookahead: subsequent row has comparable column density (indicates data begins underneath)
 */
export function detectHeaderRow(
  rawMatrix: unknown[][],
  searchDepth = 20
): number {
  if (!rawMatrix || rawMatrix.length === 0) {
    return 0;
  }

  const limit = Math.min(rawMatrix.length, searchDepth);
  let bestRowIndex = 0;
  let highestScore = -1;

  for (let r = 0; r < limit; r++) {
    const row = rawMatrix[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    // Filter non-null, non-empty values
    const nonNullValues = row.filter(
      (val) =>
        val !== null && val !== undefined && String(val).trim().length > 0
    );

    if (nonNullValues.length === 0) continue;

    const totalCells = nonNullValues.length;

    // String count (headers are almost exclusively text/strings)
    const stringCount = nonNullValues.filter(
      (val) => typeof val === "string" && isNaN(Number(val.trim()))
    ).length;

    // Unique values count
    const uniqueCount = new Set(
      nonNullValues.map((v) => String(v).trim().toLowerCase())
    ).size;

    // Distinctness ratio (penalize rows with duplicate values)
    const distinctRatio = uniqueCount / totalCells;

    // Lookahead: does the next row have data?
    const nextRow = rawMatrix[r + 1];
    let nextRowDensity = 0;
    if (nextRow && Array.isArray(nextRow)) {
      const nextNonNull = nextRow.filter(
        (val) => val !== null && val !== undefined && String(val).trim() !== ""
      );
      nextRowDensity = nextNonNull.length;
    }

    // Score calculation
    // - Base score: number of string cells
    // - Bonus for high distinctness
    // - Bonus if next row has similar or higher non-empty cell count (indicating header precedes data rows)
    let score = stringCount * 2 + totalCells;
    if (distinctRatio > 0.8) score += 3;
    if (nextRowDensity >= Math.min(2, totalCells)) score += 2;

    // Penalty for single-cell banner titles (often merged header at row 0)
    if (totalCells === 1 && nextRowDensity > 2) {
      score -= 5;
    }

    if (score > highestScore) {
      highestScore = score;
      bestRowIndex = r;
    }
  }

  return bestRowIndex;
}

/**
 * Normalizes header string into a safe property key:
 * e.g. " First Name " -> "first_name", "Email (Personal)" -> "email_personal"
 */
function normalizeHeaderKey(header: string, index: number): string {
  const cleaned = header
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // remove special characters
    .replace(/[\s-]+/g, "_"); // replace spaces and dashes with underscore

  return cleaned.length > 0 ? cleaned : `column_${index + 1}`;
}

/**
 * Cleans header display label:
 * e.g. "  Full  Name\n  " -> "Full Name"
 */
function cleanHeaderLabel(header: string, index: number): string {
  const cleaned = header
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : `Column ${index + 1}`;
}

/**
 * Builds unique, structured ExcelHeader definitions from a raw header row array.
 * Automatically handles duplicates and blank column headers.
 */
export function buildHeadersFromRow(rawHeaders: unknown[]): ExcelHeader[] {
  const headers: ExcelHeader[] = [];
  const usedKeys = new Map<string, number>();

  rawHeaders.forEach((val, idx) => {
    const rawString = val !== null && val !== undefined ? String(val) : "";
    const label = cleanHeaderLabel(rawString, idx);
    let key = normalizeHeaderKey(rawString, idx);

    // Handle duplicate keys by appending an incrementing index
    const count = usedKeys.get(key) || 0;
    if (count > 0) {
      const uniqueKey = `${key}_${count}`;
      usedKeys.set(key, count + 1);
      key = uniqueKey;
    } else {
      usedKeys.set(key, 1);
    }

    headers.push({
      index: idx,
      key,
      label,
      originalName: rawString,
    });
  });

  return headers;
}

/**
 * Formats a cell value according to parse options (dates, numbers, strings, booleans, nulls)
 */
function formatCellValue(
  value: unknown,
  options?: { formatDates?: boolean; trimValues?: boolean }
): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  // Handle Date objects (parsed by SheetJS when cellDates: true)
  if (value instanceof Date && !isNaN(value.getTime())) {
    if (options?.formatDates !== false) {
      // If it's a date-only (00:00:00 UTC), format as YYYY-MM-DD
      const iso = value.toISOString();
      if (iso.endsWith("T00:00:00.000Z")) {
        return iso.split("T")[0];
      }
      return iso;
    }
    return value;
  }

  if (typeof value === "string") {
    const str = options?.trimValues !== false ? value.trim() : value;
    return str === "" ? null : str;
  }

  if (typeof value === "number") {
    return isNaN(value) ? null : value;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return value;
}

/**
 * Checks if a row record is completely empty (all mapped fields null, undefined, or empty string)
 */
function isRowEmpty(row: Record<string, unknown>, keys: string[]): boolean {
  for (const key of keys) {
    const val = row[key];
    if (val !== null && val !== undefined && val !== "") {
      return false;
    }
  }
  return true;
}

/**
 * Parses an Excel sheet into structured headers and raw rows.
 * Makes zero entity-specific assumptions.
 */
export function parseExcelSheet(
  fileBuffer: ArrayBuffer | Uint8Array | Buffer,
  options?: ExcelParseOptions
): ExcelParsedData<ExcelRawRow> {
  const buffer = toBuffer(fileBuffer);

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: true,
      dense: true,
      raw: false,
    });
  } catch {
    throw new ValidationError(
      "Failed to parse Excel spreadsheet. Please ensure the file is valid."
    );
  }

  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) {
    throw new ValidationError("Workbook contains no sheets.");
  }

  // Select target sheet
  let selectedSheetName = sheetNames[0];
  if (options?.sheetName) {
    if (!sheetNames.includes(options.sheetName)) {
      throw new BadRequestError(
        `Sheet '${options.sheetName}' not found in workbook. Available sheets: ${sheetNames.join(", ")}`
      );
    }
    selectedSheetName = options.sheetName;
  } else if (
    options?.sheetIndex !== undefined &&
    options.sheetIndex >= 0 &&
    options.sheetIndex < sheetNames.length
  ) {
    selectedSheetName = sheetNames[options.sheetIndex];
  }

  const worksheet = workbook.Sheets[selectedSheetName];
  if (!worksheet) {
    throw new ValidationError(
      `Sheet '${selectedSheetName}' is empty or invalid.`
    );
  }

  // Convert worksheet to raw 2D array
  const rawMatrix: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    blankrows: true,
  });

  if (!rawMatrix || rawMatrix.length === 0) {
    return {
      headers: [],
      rows: [],
      totalRows: 0,
      totalColumns: 0,
      sheetNames,
      selectedSheet: selectedSheetName,
      headerRowIndex: 0,
    };
  }

  // Determine header row index
  let headerRowIndex: number;
  if (options?.headerRowIndex !== undefined && options.headerRowIndex >= 0) {
    if (options.headerRowIndex >= rawMatrix.length) {
      throw new BadRequestError(
        `Specified headerRowIndex (${options.headerRowIndex}) exceeds total row count (${rawMatrix.length}).`
      );
    }
    headerRowIndex = options.headerRowIndex;
  } else if (options?.autoDetectHeader !== false) {
    headerRowIndex = detectHeaderRow(
      rawMatrix,
      options?.headerSearchDepth ?? 20
    );
  } else {
    headerRowIndex = 0;
  }

  const rawHeaderRow = rawMatrix[headerRowIndex] || [];
  const headers = buildHeadersFromRow(rawHeaderRow);
  const headerKeys = headers.map((h) => h.key);

  // Extract data rows starting from headerRowIndex + 1
  const rows: ExcelRawRow[] = [];
  const startRow = headerRowIndex + 1;
  const maxRows = options?.maxRows;
  const skipEmptyRows = options?.skipEmptyRows !== false;
  const trimValues = options?.trimValues !== false;
  const formatDates = options?.formatDates !== false;

  for (let r = startRow; r < rawMatrix.length; r++) {
    if (maxRows !== undefined && rows.length >= maxRows) {
      break;
    }

    const physicalRowNumber = r + 1; // 1-based row number in Excel
    const matrixRow = rawMatrix[r] || [];

    const rowData: ExcelRawRow = {
      __rowNumber: physicalRowNumber,
    };

    headers.forEach((header) => {
      const cellVal = matrixRow[header.index];
      rowData[header.key] = formatCellValue(cellVal, {
        formatDates,
        trimValues,
      });
    });

    if (skipEmptyRows && isRowEmpty(rowData, headerKeys)) {
      continue;
    }

    rows.push(rowData);
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
    totalColumns: headers.length,
    sheetNames,
    selectedSheet: selectedSheetName,
    headerRowIndex,
  };
}

/**
 * Chunked batch processing utility (Architecture Correction #9):
 * Processes an array of items in isolated chunks (e.g. 200 items per chunk)
 * with row-level error isolation so that failure in one row does not crash or invalidate the entire batch.
 *
 * @param items Array of input items to process
 * @param chunkSize Number of items per chunk (e.g. 100 or 200)
 * @param processChunkFn Async handler for processing each chunk
 * @returns Aggregated BatchProcessingResult with individual success/failure stats
 */
export async function processInChunks<TInput>(
  items: TInput[],
  chunkSize: number,
  processChunkFn: (
    chunk: TInput[],
    chunkIndex: number,
    startItemIndex: number
  ) => Promise<Array<BatchProcessingItemResult<TInput>>>
): Promise<BatchProcessingResult<TInput>> {
  if (chunkSize <= 0) {
    throw new BadRequestError("chunkSize must be greater than 0");
  }

  const results: BatchProcessingItemResult<TInput>[] = [];
  const errors: BatchItemError[] = [];
  let successCount = 0;
  let failureCount = 0;

  const totalChunks = Math.ceil(items.length / chunkSize);

  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    const startIdx = chunkIdx * chunkSize;
    const endIdx = Math.min(startIdx + chunkSize, items.length);
    const chunk = items.slice(startIdx, endIdx);

    try {
      const chunkResults = await processChunkFn(chunk, chunkIdx, startIdx);

      chunkResults.forEach((itemResult, localIdx) => {
        const globalIdx = startIdx + localIdx;
        results.push(itemResult);

        if (itemResult.success) {
          successCount++;
        } else {
          failureCount++;
          const rowNum = (itemResult.item as { __rowNumber?: number })
            ?.__rowNumber;
          errors.push({
            index: globalIdx,
            rowNumber: rowNum,
            error: itemResult.error || "Unknown item processing error",
            data: itemResult.data,
          });
        }
      });
    } catch (chunkError: unknown) {
      // Chunk-level exception fallback: mark all items in this chunk as failed
      const errorMessage =
        chunkError instanceof Error ? chunkError.message : String(chunkError);

      chunk.forEach((item, localIdx) => {
        const globalIdx = startIdx + localIdx;
        const rowNum = (item as { __rowNumber?: number })?.__rowNumber;
        const failedResult: BatchProcessingItemResult<TInput> = {
          item,
          index: globalIdx,
          success: false,
          error: errorMessage,
        };

        results.push(failedResult);
        failureCount++;
        errors.push({
          index: globalIdx,
          rowNumber: rowNum,
          error: errorMessage,
        });
      });
    }
  }

  return {
    totalItems: items.length,
    processedItems: results.length,
    successCount,
    failureCount,
    results,
    errors,
  };
}
