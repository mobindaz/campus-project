import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import {
  validateExcelFile,
  getExcelWorkbookInfo,
  detectHeaderRow,
  buildHeadersFromRow,
  parseExcelSheet,
  processInChunks,
  getFileExtension,
} from "./excel-import.service";
import { ValidationError, BadRequestError } from "@/server/errors/app-error";

/** Helper to create an in-memory XLSX buffer from a 2D array of cells */
function createWorkbookBuffer(
  sheets: Record<string, unknown[][]> = {
    Sheet1: [
      ["Col1", "Col2"],
      ["A", "B"],
    ],
  }
): Uint8Array {
  const wb = XLSX.utils.book_new();
  for (const [sheetName, data] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}

describe("Excel Import Service", () => {
  describe("File Validation & Extension helper", () => {
    it("correctly extracts file extension", () => {
      expect(getFileExtension("test.xlsx")).toBe(".xlsx");
      expect(getFileExtension("MY_DATA.XLS")).toBe(".xls");
      expect(getFileExtension("archive.csv")).toBe(".csv");
      expect(getFileExtension("noextension")).toBe("");
    });

    it("validates a valid xlsx buffer successfully", () => {
      const buffer = createWorkbookBuffer();
      const result = validateExcelFile(buffer, "sample.xlsx");
      expect(result.valid).toBe(true);
      expect(result.fileName).toBe("sample.xlsx");
      expect(result.extension).toBe(".xlsx");
      expect(result.sizeBytes).toBeGreaterThan(0);
    });

    it("throws ValidationError if buffer is empty", () => {
      const emptyBuffer = new Uint8Array(0);
      expect(() => validateExcelFile(emptyBuffer, "empty.xlsx")).toThrow(
        ValidationError
      );
      expect(() => validateExcelFile(emptyBuffer, "empty.xlsx")).toThrow(
        "The uploaded file is empty"
      );
    });

    it("throws ValidationError if file exceeds maximum size limit", () => {
      const buffer = createWorkbookBuffer();
      expect(() =>
        validateExcelFile(buffer, "sample.xlsx", { maxSizeBytes: 100 })
      ).toThrow(ValidationError);
    });

    it("throws ValidationError for forbidden file extensions", () => {
      const buffer = createWorkbookBuffer();
      expect(() => validateExcelFile(buffer, "sample.pdf")).toThrow(
        ValidationError
      );
      expect(() => validateExcelFile(buffer, "sample.pdf")).toThrow(
        "Invalid file extension"
      );
    });

    it("throws ValidationError for corrupted file content", () => {
      const corruptBuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(() => validateExcelFile(corruptBuffer, "bad.xlsx")).toThrow(
        ValidationError
      );
    });
  });

  describe("Workbook & Sheet Inspection", () => {
    it("returns sheet names and dimensions for multi-sheet workbook", () => {
      const buffer = createWorkbookBuffer({
        Overview: [["Title"], ["Desc"]],
        DataSheet: [
          ["ID", "Name", "Score"],
          [1, "Alpha", 95],
          [2, "Beta", 88],
        ],
        EmptySheet: [],
      });

      const info = getExcelWorkbookInfo(buffer);
      expect(info.totalSheets).toBe(3);
      expect(info.sheetNames).toEqual(["Overview", "DataSheet", "EmptySheet"]);

      const dataSheet = info.sheets.find((s) => s.name === "DataSheet");
      expect(dataSheet).toBeDefined();
      expect(dataSheet?.rowCount).toBe(3);
      expect(dataSheet?.columnCount).toBe(3);
      expect(dataSheet?.isEmpty).toBe(false);

      const emptySheet = info.sheets.find((s) => s.name === "EmptySheet");
      expect(emptySheet?.isEmpty).toBe(true);
    });
  });

  describe("Header Detection & Normalization", () => {
    it("detects header row at row 0 when data starts immediately", () => {
      const rawMatrix = [
        ["Code", "Name", "Department", "Email"],
        ["CS101", "Algorithms", "CS", "cs101@college.edu"],
        ["CS102", "Databases", "CS", "cs102@college.edu"],
      ];

      const detected = detectHeaderRow(rawMatrix);
      expect(detected).toBe(0);
    });

    it("detects header row when file has title banner and metadata rows at the top", () => {
      const rawMatrix = [
        ["COLLEGE ANNUAL REPORT 2026"], // Banner row (1 cell)
        ["Generated: 2026-08-23", "Author: Admin"], // Metadata
        [], // Empty row
        ["Employee ID", "Full Name", "Designation", "Work Email", "Join Date"], // Actual headers
        [
          "EMP001",
          "Dr. Jane Doe",
          "Professor",
          "jane@college.edu",
          "2020-01-15",
        ],
        [
          "EMP002",
          "Dr. John Smith",
          "Assoc Professor",
          "john@college.edu",
          "2021-06-01",
        ],
      ];

      const detected = detectHeaderRow(rawMatrix);
      expect(detected).toBe(3);
    });

    it("normalizes keys and cleans labels while preserving original names", () => {
      const rawHeaders = [
        "  Full Name  ",
        "Work / Personal Email",
        "Contact # (Primary)",
      ];
      const headers = buildHeadersFromRow(rawHeaders);

      expect(headers).toHaveLength(3);
      expect(headers[0]).toEqual({
        index: 0,
        key: "full_name",
        label: "Full Name",
        originalName: "  Full Name  ",
      });
      expect(headers[1]).toEqual({
        index: 1,
        key: "work_personal_email",
        label: "Work / Personal Email",
        originalName: "Work / Personal Email",
      });
      expect(headers[2]).toEqual({
        index: 2,
        key: "contact_primary",
        label: "Contact # (Primary)",
        originalName: "Contact # (Primary)",
      });
    });

    it("handles duplicate column headers by generating unique keys", () => {
      const rawHeaders = ["Email", "Phone", "Email", "Notes", "Email"];
      const headers = buildHeadersFromRow(rawHeaders);

      expect(headers.map((h) => h.key)).toEqual([
        "email",
        "phone",
        "email_1",
        "notes",
        "email_2",
      ]);
    });

    it("handles empty and null column headers with fallback names", () => {
      const rawHeaders = ["ID", "", null, "   ", "Title"];
      const headers = buildHeadersFromRow(rawHeaders);

      expect(headers[0].key).toBe("id");
      expect(headers[1].key).toBe("column_2");
      expect(headers[1].label).toBe("Column 2");
      expect(headers[2].key).toBe("column_3");
      expect(headers[3].key).toBe("column_4");
      expect(headers[4].key).toBe("title");
    });
  });

  describe("Excel Sheet Parsing & Row Extraction", () => {
    it("parses an arbitrary .xlsx file with unusual header row and unusual column order", () => {
      const rawData = [
        ["INTERNAL OPERATIONS DATASET"], // Line 1 (r=0) - Banner
        ["Department: Engineering", "Year: 2026"], // Line 2 (r=1) - Subheading
        [], // Line 3 (r=2) - Blank
        [
          "Date of Joining",
          "Contact No",
          "Full Legal Name",
          "Is Active?",
          "Salary Score",
        ], // Line 4 (r=3) - Header
        ["2024-05-10", "9876543210", "Alice Smith", true, 85.5],
        ["2023-11-20", "9123456780", "Bob Jones", false, 92],
      ];

      const buffer = createWorkbookBuffer({ CustomSheet: rawData });
      const result = parseExcelSheet(buffer);

      expect(result.selectedSheet).toBe("CustomSheet");
      expect(result.headerRowIndex).toBe(3);
      expect(result.totalRows).toBe(2);
      expect(result.headers.map((h) => h.key)).toEqual([
        "date_of_joining",
        "contact_no",
        "full_legal_name",
        "is_active",
        "salary_score",
      ]);

      // Row 1
      expect(result.rows[0].__rowNumber).toBe(5); // Physical row 5 in Excel
      expect(result.rows[0].full_legal_name).toBe("Alice Smith");
      expect(result.rows[0].contact_no).toBe("9876543210");
      expect(result.rows[0].is_active).toBe(true);
      expect(result.rows[0].salary_score).toBe(85.5);

      // Row 2
      expect(result.rows[1].__rowNumber).toBe(6); // Physical row 6 in Excel
      expect(result.rows[1].full_legal_name).toBe("Bob Jones");
      expect(result.rows[1].is_active).toBe(false);
      expect(result.rows[1].salary_score).toBe(92);
    });

    it("respects explicit headerRowIndex and sheetName options", () => {
      const rawData1 = [
        ["A1", "B1"],
        ["ValA", "ValB"],
      ];
      const rawData2 = [
        ["Note 1"],
        ["Code", "Description", "Active"],
        ["C1", "Item One", true],
        ["C2", "Item Two", false],
      ];

      const buffer = createWorkbookBuffer({
        SheetA: rawData1,
        TargetSheet: rawData2,
      });

      const result = parseExcelSheet(buffer, {
        sheetName: "TargetSheet",
        headerRowIndex: 1,
      });

      expect(result.selectedSheet).toBe("TargetSheet");
      expect(result.headerRowIndex).toBe(1);
      expect(result.totalRows).toBe(2);
      expect(result.headers.map((h) => h.key)).toEqual([
        "code",
        "description",
        "active",
      ]);
      expect(result.rows[0].code).toBe("C1");
      expect(result.rows[0].__rowNumber).toBe(3);
    });

    it("throws BadRequestError if non-existent sheetName is requested", () => {
      const buffer = createWorkbookBuffer();
      expect(() =>
        parseExcelSheet(buffer, { sheetName: "NonExistentSheet" })
      ).toThrow(BadRequestError);
    });

    it("skips empty rows while maintaining correct original physical row numbers", () => {
      const rawData = [
        ["Key", "Value"],
        ["K1", "V1"],
        [null, "   "], // Empty row
        ["K2", "V2"],
        ["", null], // Empty row
        ["K3", "V3"],
      ];

      const buffer = createWorkbookBuffer({ Data: rawData });
      const result = parseExcelSheet(buffer, { skipEmptyRows: true });

      expect(result.totalRows).toBe(3);
      expect(result.rows[0]).toEqual({
        __rowNumber: 2,
        key: "K1",
        value: "V1",
      });
      expect(result.rows[1]).toEqual({
        __rowNumber: 4,
        key: "K2",
        value: "V2",
      });
      expect(result.rows[2]).toEqual({
        __rowNumber: 6,
        key: "K3",
        value: "V3",
      });
    });

    it("trims whitespace from cell strings and handles nulls properly", () => {
      const rawData = [
        ["Name", "Code"],
        ["  Padded Name  ", "  ABC  "],
        ["", "   "],
        ["Plain", null],
      ];

      const buffer = createWorkbookBuffer({ Data: rawData });
      const result = parseExcelSheet(buffer, { trimValues: true });

      expect(result.rows[0].name).toBe("Padded Name");
      expect(result.rows[0].code).toBe("ABC");
      expect(result.rows[1].name).toBe("Plain");
      expect(result.rows[1].code).toBeNull();
    });

    it("respects maxRows cap when specified", () => {
      const rawData = [
        ["ID", "Name"],
        [1, "First"],
        [2, "Second"],
        [3, "Third"],
        [4, "Fourth"],
      ];

      const buffer = createWorkbookBuffer({ Data: rawData });
      const result = parseExcelSheet(buffer, { maxRows: 2 });

      expect(result.totalRows).toBe(2);
      expect(result.rows.map((r) => r.name)).toEqual(["First", "Second"]);
    });
  });

  describe("Chunked Processing Utility (Architecture Correction #9)", () => {
    it("processes items in chunks and isolates individual item errors", async () => {
      interface TestItem {
        id: number;
        val: string;
        __rowNumber: number;
      }

      const items: TestItem[] = [
        { id: 1, val: "ok1", __rowNumber: 2 },
        { id: 2, val: "ok2", __rowNumber: 3 },
        { id: 3, val: "fail", __rowNumber: 4 }, // Should fail
        { id: 4, val: "ok3", __rowNumber: 5 },
        { id: 5, val: "ok4", __rowNumber: 6 },
      ];

      const result = await processInChunks(items, 2, async (chunk) => {
        return chunk.map((item, idx) => {
          if (item.val === "fail") {
            return {
              item,
              index: idx,
              success: false,
              error: "Invalid item value",
            };
          }
          return {
            item,
            index: idx,
            success: true,
            data: { savedId: item.id },
          };
        });
      });

      expect(result.totalItems).toBe(5);
      expect(result.processedItems).toBe(5);
      expect(result.successCount).toBe(4);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        index: 2,
        rowNumber: 4,
        error: "Invalid item value",
        data: undefined,
      });
    });

    it("handles chunk-level exceptions gracefully without terminating entire batch", async () => {
      const items = [1, 2, 3, 4, 5, 6];

      const result = await processInChunks(
        items,
        2,
        async (chunk, chunkIdx) => {
          if (chunkIdx === 1) {
            // Chunk 1 (items 3, 4) throws an unexpected error
            throw new Error("Database deadlock in chunk 1");
          }
          return chunk.map((item, idx) => ({
            item,
            index: idx,
            success: true,
          }));
        }
      );

      expect(result.totalItems).toBe(6);
      expect(result.successCount).toBe(4); // chunk 0 and chunk 2 succeed
      expect(result.failureCount).toBe(2); // chunk 1 fails
      expect(result.errors[0].error).toContain("Database deadlock in chunk 1");
    });
  });
});
