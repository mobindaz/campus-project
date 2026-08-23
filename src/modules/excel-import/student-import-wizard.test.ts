import { describe, it, expect, vi, beforeEach } from "vitest";
import * as XLSX from "xlsx";
import {
  validateExcelFile,
  getExcelWorkbookInfo,
  parseExcelSheet,
} from "@/server/services/excel-import.service";
import { suggestColumnMappings } from "@/server/services/column-mapping.service";
import {
  analyzeAndResolveFieldValues,
  applyValueMappings,
} from "@/server/services/value-mapping.service";
import { validateStudentImportRows } from "@/server/services/import-validation.service";
import { executeStudentImportService } from "@/server/services/import-execution.service";

// Mock repositories & services
vi.mock("@/server/repositories/department.repository", () => ({
  listDepartments: vi.fn(),
}));

vi.mock("@/server/repositories/program.repository", () => ({
  listPrograms: vi.fn(),
}));

vi.mock("@/server/repositories/batch.repository", () => ({
  listBatches: vi.fn(),
}));

vi.mock("@/server/repositories/academic-period.repository", () => ({
  listAcademicPeriods: vi.fn(),
}));

vi.mock("@/server/repositories/custom-field.repository", () => ({
  listCustomFieldDefinitions: vi.fn(),
}));

vi.mock("@/server/repositories/student.repository", () => ({
  findStudentsByRegisterNumbers: vi.fn(),
  findStudentsByEmails: vi.fn(),
  upsertStudentByRegisterNumber: vi.fn(),
  upsertStudentByEmail: vi.fn(),
}));

vi.mock("@/server/repositories/import-mapping.repository", () => ({
  listImportMappings: vi.fn(),
  findImportMappingByName: vi.fn(),
  createImportMapping: vi.fn(),
}));

vi.mock("@/server/repositories/value-mapping.repository", () => ({
  listValueMappings: vi.fn(),
  findValueMappingsForField: vi.fn(),
  upsertValueMapping: vi.fn(),
}));

vi.mock("@/server/repositories/import-history.repository", () => ({
  createImportHistory: vi.fn(),
  listImportHistories: vi.fn(),
  findImportHistoryById: vi.fn(),
}));

vi.mock("@/server/services/rbac.service", () => ({
  getUserRoles: vi
    .fn()
    .mockResolvedValue([{ id: "r1", name: "Admin", code: "SUPER_ADMIN" }]),
  getUserDepartmentScopes: vi.fn().mockResolvedValue([]),
  getUserPermissions: vi.fn().mockResolvedValue(["imports.manage"]),
}));

vi.mock("@/server/services/audit.service", () => ({
  logAudit: vi.fn().mockResolvedValue(true),
}));

import * as deptRepo from "@/server/repositories/department.repository";
import * as progRepo from "@/server/repositories/program.repository";
import * as batchRepo from "@/server/repositories/batch.repository";
import * as periodRepo from "@/server/repositories/academic-period.repository";
import * as customRepo from "@/server/repositories/custom-field.repository";
import * as studentRepo from "@/server/repositories/student.repository";
import * as mappingRepo from "@/server/repositories/import-mapping.repository";
import * as valueMappingRepo from "@/server/repositories/value-mapping.repository";
import * as historyRepo from "@/server/repositories/import-history.repository";

describe("Prompt 20: End-to-End Student Import Wizard Pipeline", () => {
  const mockUser = {
    id: "user_admin_1",
    name: "Campus Operations Administrator",
    email: "admin@college.edu",
  };

  const sampleDepartments = [
    {
      id: "dept_cse",
      name: "Computer Science & Engineering",
      code: "CSE",
      isActive: true,
    },
    {
      id: "dept_ece",
      name: "Electronics & Communication Engineering",
      code: "ECE",
      isActive: true,
    },
  ];

  const samplePrograms = [
    {
      id: "prog_btech",
      name: "Bachelor of Technology",
      code: "B.Tech",
      isActive: true,
    },
  ];

  const sampleBatches = [
    {
      id: "batch_2024_28",
      name: "2024 - 2028",
      code: "2024-28",
      isActive: true,
    },
  ];

  const samplePeriods = [
    { id: "period_sem1", name: "Semester 1", code: "Sem 1", isActive: true },
  ];

  const sampleCustomFields = [
    {
      id: "cf_hostel",
      entityType: "STUDENT",
      name: "hostelBlock",
      label: "Hostel Block",
      type: "TEXT" as const,
      required: false,
      unique: false,
      defaultValue: null,
      helpText: null,
      visibility: "ALL",
      order: 1,
      options: null,
      validation: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(deptRepo.listDepartments).mockResolvedValue(
      sampleDepartments as never
    );
    vi.mocked(progRepo.listPrograms).mockResolvedValue(samplePrograms as never);
    vi.mocked(batchRepo.listBatches).mockResolvedValue(sampleBatches as never);
    vi.mocked(periodRepo.listAcademicPeriods).mockResolvedValue(
      samplePeriods as never
    );
    vi.mocked(customRepo.listCustomFieldDefinitions).mockResolvedValue(
      sampleCustomFields as never
    );
    vi.mocked(mappingRepo.listImportMappings).mockResolvedValue([]);
    vi.mocked(valueMappingRepo.listValueMappings).mockResolvedValue([]);
    vi.mocked(valueMappingRepo.findValueMappingsForField).mockResolvedValue([]);
    vi.mocked(studentRepo.findStudentsByRegisterNumbers).mockResolvedValue([]);
    vi.mocked(studentRepo.findStudentsByEmails).mockResolvedValue([]);

    vi.mocked(historyRepo.createImportHistory).mockImplementation(
      async (data) => ({
        id: "hist_sample_123",
        entityType: data.entityType,
        fileName: data.fileName,
        fileSize: data.fileSize || 1024,
        uploadedById: data.uploadedById || null,
        uploadedBy: data.uploadedBy,
        matchingKey: data.matchingKey,
        totalRows: data.totalRows,
        createdCount: data.createdCount,
        updatedCount: data.updatedCount,
        skippedCount: data.skippedCount,
        errorCount: data.errorCount,
        status: data.status,
        errors: data.errors as never,
        metadata: data.metadata as never,
        createdAt: new Date(),
      })
    );
  });

  it("DONE WHEN: takes a messy, realistically-shaped sample spreadsheet through the entire wizard pipeline to a completed import with isolated error handling", async () => {
    // ─── 1. Build realistic messy spreadsheet buffer ────────────────────────
    // Header row with unusual names:
    // "Enrollment Number" -> registerNumber
    // "Candidate Full Name" -> name
    // "Branch Abbr" -> department
    // "Degree Level" -> program
    // "Grad Batch" -> batch
    // "Semester Term" -> academicPeriod
    // "Personal Email ID" -> email
    // "Contact Number" -> phone
    // "Date of Birth" -> dateOfBirth
    // "Hostel Block" -> hostelBlock (custom field)
    const messyHeaders = [
      "Enrollment Number",
      "Candidate Full Name",
      "Branch Abbr",
      "Degree Level",
      "Grad Batch",
      "Semester Term",
      "Personal Email ID",
      "Contact Number",
      "Date of Birth",
      "Hostel Block",
    ];

    const messyRows = [
      // Row 1: Valid row
      [
        "2024CS001",
        "Aarav Sharma",
        "CSE",
        "B.Tech",
        "2024-28",
        "Sem 1",
        "aarav.sharma@example.edu",
        "9876543210",
        "2004-05-18",
        "Block A",
      ],
      // Row 2: Value alias test: "CS" (heuristic suggestion confirmed -> dept_cse)
      [
        "2024CS002",
        "Diya Patel",
        "CS",
        "B.Tech",
        "2024-28",
        "Sem 1",
        "diya.patel@example.edu",
        "9876543211",
        "2004-08-22",
        "Block B",
      ],
      // Row 3: Deliberately broken row (missing enrollment number)
      [
        "",
        "Broken Bob",
        "CSE",
        "B.Tech",
        "2024-28",
        "Sem 1",
        "broken.bob@example.edu",
        "9876543212",
        "2004-01-01",
        "Block C",
      ],
      // Row 4: Valid row
      [
        "2024CS003",
        "Charlie Green",
        "CSE",
        "B.Tech",
        "2024-28",
        "Sem 1",
        "charlie.green@example.edu",
        "9876543213",
        "2004-11-15",
        "Block D",
      ],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([messyHeaders, ...messyRows]);
    XLSX.utils.book_append_sheet(wb, ws, "Student Records 2024");
    const buffer = XLSX.write(wb, {
      type: "array",
      bookType: "xlsx",
    }) as ArrayBuffer;

    // ─── 2. Step 1: File Validation & Inspection ───────────────────────────
    validateExcelFile(buffer, "students_messy_2024.xlsx");
    const workbookInfo = getExcelWorkbookInfo(buffer);

    expect(workbookInfo.totalSheets).toBe(1);
    expect(workbookInfo.sheets[0].name).toBe("Student Records 2024");

    // ─── 3. Step 2: Parse Sheet into Raw Rows ──────────────────────────────
    const parsedData = parseExcelSheet(buffer, {
      sheetName: "Student Records 2024",
      headerRowIndex: 0,
      skipEmptyRows: true,
      trimValues: true,
    });

    expect(parsedData.totalRows).toBe(4);
    expect(parsedData.headers).toHaveLength(10);

    // ─── 4. Step 3: Column Mapping with Auto-Suggestion ────────────────────
    const extractedHeaders = parsedData.headers.map(
      (h) => h.originalName || h.label || h.key
    );
    const mappingSuggestions = await suggestColumnMappings(
      extractedHeaders,
      "STUDENT"
    );

    // Verify auto-matching of aliased columns:
    expect(
      mappingSuggestions.suggestions["Enrollment Number"]?.suggestedKey
    ).toBe("registerNumber");
    expect(
      mappingSuggestions.suggestions["Candidate Full Name"]?.suggestedKey
    ).toBe("name");
    expect(mappingSuggestions.suggestions["Branch Abbr"]?.suggestedKey).toBe(
      "department"
    );
    expect(
      mappingSuggestions.suggestions["Personal Email ID"]?.suggestedKey
    ).toBe("email");
    expect(mappingSuggestions.suggestions["Contact Number"]?.suggestedKey).toBe(
      "phone"
    );
    expect(mappingSuggestions.suggestions["Date of Birth"]?.suggestedKey).toBe(
      "dateOfBirth"
    );
    expect(mappingSuggestions.suggestions["Hostel Block"]?.suggestedKey).toBe(
      "hostelBlock"
    );

    // Admin confirms column mapping:
    const confirmedColumnMapping: Record<string, string> = {
      "Enrollment Number": "registerNumber",
      "Candidate Full Name": "name",
      "Branch Abbr": "department",
      "Degree Level": "program",
      "Grad Batch": "batch",
      "Semester Term": "academicPeriod",
      "Personal Email ID": "email",
      "Contact Number": "phone",
      "Date of Birth": "dateOfBirth",
      "Hostel Block": "hostelBlock",
    };

    const headerKeyLookup = new Map<string, string>();
    for (const h of parsedData.headers) {
      headerKeyLookup.set(h.originalName || h.label || h.key, h.key);
      headerKeyLookup.set(h.label, h.key);
      headerKeyLookup.set(h.key, h.key);
    }

    // Transform spreadsheet rows into canonical objects
    const mappedRows = parsedData.rows.map((row, idx) => {
      const canonicalRow: Record<string, unknown> = {
        rowNumber: idx + 2,
      };
      for (const [srcHeader, canonKey] of Object.entries(
        confirmedColumnMapping
      )) {
        if (canonKey && canonKey !== "__ignore__") {
          const rowKey = headerKeyLookup.get(srcHeader) || srcHeader;
          canonicalRow[canonKey] =
            row[rowKey] !== undefined ? row[rowKey] : row[srcHeader];
        }
      }
      return canonicalRow;
    });

    // ─── 5. Step 4: Value Mapping & Alias Resolution (Spec §18) ────────────
    const valueResolution = await analyzeAndResolveFieldValues(
      mappedRows,
      ["department", "program", "batch", "academicPeriod"],
      "STUDENT"
    );

    expect(valueResolution.items).toBeDefined();

    // "CSE" is exact match
    const cseRes = valueResolution.items.find(
      (r) => r.fieldKey === "department" && r.sourceValue === "CSE"
    );
    expect(cseRes?.status).toBe("RESOLVED_EXACT");
    expect(cseRes?.resolvedTargetId).toBe("dept_cse");

    // "CS" is suggested candidate
    const csRes = valueResolution.items.find(
      (r) => r.fieldKey === "department" && r.sourceValue === "CS"
    );
    expect(csRes?.status).toBe("SUGGESTED_MATCH");

    // Admin confirms mapping "CS" -> "dept_cse"
    const confirmedValueMappings: Record<string, Record<string, string>> = {
      department: {
        CSE: "dept_cse",
        CS: "dept_cse",
      },
      program: {
        "B.Tech": "prog_btech",
      },
      batch: {
        "2024-28": "batch_2024_28",
      },
      academicPeriod: {
        "Sem 1": "period_sem1",
      },
    };

    const valueResolvedRows = applyValueMappings(
      mappedRows,
      confirmedValueMappings
    );

    // ─── 6. Step 5: Row-Level Validation & Preview (Spec §19–20) ───────────
    const validationResult = await validateStudentImportRows(
      valueResolvedRows,
      "registerNumber"
    );

    // Validate preview summary counts
    expect(validationResult.summary.totalRows).toBe(4);
    expect(validationResult.summary.validRows).toBe(3); // Rows 1, 2, 4 are valid
    expect(validationResult.summary.errorRows).toBe(1); // Row 3 is broken
    expect(validationResult.summary.canProceed).toBe(true);

    // Verify row 3 has validation error
    const row3Validation = validationResult.rows.find((r) => r.rowNumber === 4);
    expect(row3Validation?.status).toBe("ERROR");
    expect(row3Validation?.errors[0].field).toBe("registerNumber");

    // ─── 7. Step 6: Chunked Upsert & Error Isolation (Correction #9) ────────
    vi.mocked(studentRepo.upsertStudentByRegisterNumber)
      .mockResolvedValueOnce({
        student: {
          id: "std_1",
          registerNumber: "2024CS001",
          name: "Aarav Sharma",
        } as never,
        created: true,
      })
      .mockResolvedValueOnce({
        student: {
          id: "std_2",
          registerNumber: "2024CS002",
          name: "Diya Patel",
        } as never,
        created: true,
      })
      .mockResolvedValueOnce({
        student: {
          id: "std_3",
          registerNumber: "2024CS003",
          name: "Charlie Green",
        } as never,
        created: true,
      });

    const executionResult = await executeStudentImportService(mockUser, {
      entityType: "STUDENT",
      fileName: "students_messy_2024.xlsx",
      matchingStrategy: "registerNumber",
      rows: validationResult.rows.map((r) => ({
        ...r.data,
        action: r.action,
        errors: r.errors,
      })),
      skipErrors: true,
      chunkSize: 200,
    });

    // ─── 8. Final Verification of Requirements ─────────────────────────────
    expect(executionResult.totalRows).toBe(4);
    expect(executionResult.createdCount).toBe(3); // Rows 1, 2, 4 created
    expect(executionResult.skippedCount).toBe(1); // Row 3 skipped due to validation error
    expect(executionResult.success).toBe(true); // Partial import success
    expect(studentRepo.upsertStudentByRegisterNumber).toHaveBeenCalledTimes(3);

    // Verify audit log creation
    expect(historyRepo.createImportHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "STUDENT",
        fileName: "students_messy_2024.xlsx",
        totalRows: 4,
        createdCount: 3,
        skippedCount: 1,
      })
    );
  });
});
