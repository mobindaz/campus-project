import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateStudentImportRows,
  parseDateValue,
  isValidPhoneNumber,
} from "./import-validation.service";

// Mock repositories
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
}));

import * as deptRepo from "@/server/repositories/department.repository";
import * as progRepo from "@/server/repositories/program.repository";
import * as batchRepo from "@/server/repositories/batch.repository";
import * as periodRepo from "@/server/repositories/academic-period.repository";
import * as customRepo from "@/server/repositories/custom-field.repository";
import * as studentRepo from "@/server/repositories/student.repository";

describe("Import Validation Service (Spec §19)", () => {
  const sampleDepartments = [
    { id: "dept_cse", name: "Computer Science", code: "CSE", isActive: true },
  ];
  const samplePrograms = [
    { id: "prog_btech", name: "B.Tech", code: "BTECH", isActive: true },
  ];
  const sampleBatches = [
    { id: "batch_2024", name: "2024-28", code: "2024-28", isActive: true },
  ];
  const samplePeriods = [
    { id: "sem_1", name: "Semester 1", code: "SEM1", isActive: true },
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
    vi.mocked(customRepo.listCustomFieldDefinitions).mockResolvedValue([]);
    vi.mocked(studentRepo.findStudentsByRegisterNumbers).mockResolvedValue([]);
    vi.mocked(studentRepo.findStudentsByEmails).mockResolvedValue([]);
  });

  describe("parseDateValue", () => {
    it("parses ISO date string YYYY-MM-DD", () => {
      const parsed = parseDateValue("2004-05-18");
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed?.getUTCFullYear()).toBe(2004);
      expect(parsed?.getUTCMonth()).toBe(4); // May
      expect(parsed?.getUTCDate()).toBe(18);
    });

    it("parses DD/MM/YYYY date string", () => {
      const parsed = parseDateValue("18/05/2004");
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed?.getUTCFullYear()).toBe(2004);
      expect(parsed?.getUTCMonth()).toBe(4);
      expect(parsed?.getUTCDate()).toBe(18);
    });

    it("parses Excel serial date number", () => {
      // 38125 is 2004-05-18 in Excel serial format
      const parsed = parseDateValue(38125);
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed?.getUTCFullYear()).toBe(2004);
    });

    it("returns null for invalid date input", () => {
      expect(parseDateValue("invalid-date")).toBeNull();
      expect(parseDateValue("")).toBeNull();
      expect(parseDateValue(null)).toBeNull();
    });
  });

  describe("isValidPhoneNumber", () => {
    it("validates 10-digit standard phone numbers", () => {
      expect(isValidPhoneNumber("+91 98765 43210")).toBe(true);
      expect(isValidPhoneNumber("9876543210")).toBe(true);
      expect(isValidPhoneNumber("(555) 123-4567")).toBe(true);
    });

    it("rejects numbers that are too short", () => {
      expect(isValidPhoneNumber("123")).toBe(false);
    });
  });

  describe("validateStudentImportRows", () => {
    it("validates a completely valid row for creation", async () => {
      const rows = [
        {
          registerNumber: "2024CSE001",
          name: "Alice Smith",
          email: "alice@college.edu",
          phone: "9876543210",
          dateOfBirth: "2004-05-18",
          programId: "prog_btech",
          batchId: "batch_2024",
          academicPeriodId: "sem_1",
          departmentId: "dept_cse",
        },
      ];

      const result = await validateStudentImportRows(rows, "registerNumber");

      expect(result.summary.totalRows).toBe(1);
      expect(result.summary.validRows).toBe(1);
      expect(result.summary.createCount).toBe(1);
      expect(result.summary.errorRows).toBe(0);

      expect(result.rows[0].status).toBe("VALID");
      expect(result.rows[0].action).toBe("CREATE");
      expect(result.rows[0].data.registerNumber).toBe("2024CSE001");
    });

    it("identifies existing record for update", async () => {
      vi.mocked(studentRepo.findStudentsByRegisterNumbers).mockResolvedValue([
        {
          id: "student_1",
          registerNumber: "2024CSE001",
          name: "Alice",
          email: "alice@college.edu",
          phone: null,
          dateOfBirth: null,
          programId: "prog_btech",
          departmentId: "dept_cse",
          batchId: "batch_2024",
          academicPeriodId: "sem_1",
          isActive: true,
          customFields: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const rows = [
        {
          registerNumber: "2024CSE001",
          name: "Alice Smith Updated",
          programId: "prog_btech",
          batchId: "batch_2024",
          academicPeriodId: "sem_1",
        },
      ];

      const result = await validateStudentImportRows(rows, "registerNumber");

      expect(result.summary.validRows).toBe(1);
      expect(result.summary.updateCount).toBe(1);
      expect(result.rows[0].action).toBe("UPDATE");
      expect(result.rows[0].status).toBe("VALID");
    });

    it("flags missing register number with ERROR status and SKIP action", async () => {
      const rows = [
        {
          name: "Bob",
          programId: "prog_btech",
          batchId: "batch_2024",
          academicPeriodId: "sem_1",
        },
      ];

      const result = await validateStudentImportRows(rows, "registerNumber");

      expect(result.summary.errorRows).toBe(1);
      expect(result.summary.validRows).toBe(0);
      expect(result.rows[0].status).toBe("ERROR");
      expect(result.rows[0].action).toBe("SKIP");
      expect(result.rows[0].errors[0].field).toBe("registerNumber");
    });

    it("detects in-file duplicate register numbers", async () => {
      const rows = [
        {
          registerNumber: "2024CSE001",
          name: "Alice",
          programId: "prog_btech",
          batchId: "batch_2024",
          academicPeriodId: "sem_1",
        },
        {
          registerNumber: "2024CSE001", // Duplicate
          name: "Alice Duplicate",
          programId: "prog_btech",
          batchId: "batch_2024",
          academicPeriodId: "sem_1",
        },
      ];

      const result = await validateStudentImportRows(rows, "registerNumber");

      expect(result.summary.totalRows).toBe(2);
      expect(result.summary.validRows).toBe(1);
      expect(result.summary.duplicateRows).toBe(1);
      expect(result.rows[1].status).toBe("DUPLICATE");
      expect(result.rows[1].action).toBe("SKIP");
    });

    it("flags unknown foreign key IDs as validation errors", async () => {
      const rows = [
        {
          registerNumber: "2024CSE002",
          name: "Charlie",
          programId: "prog_UNKNOWN",
          batchId: "batch_2024",
          academicPeriodId: "sem_1",
        },
      ];

      const result = await validateStudentImportRows(rows, "registerNumber");

      expect(result.summary.errorRows).toBe(1);
      expect(result.rows[0].status).toBe("ERROR");
      expect(result.rows[0].errors[0].field).toBe("programId");
    });

    it("validates custom fields against definitions", async () => {
      vi.mocked(customRepo.listCustomFieldDefinitions).mockResolvedValue([
        {
          id: "cf_gpa",
          entityType: "STUDENT",
          name: "highSchoolGpa",
          label: "High School GPA",
          type: "NUMBER",
          required: true,
          unique: false,
          defaultValue: null,
          validation: null,
          visibility: "ALL",
          order: 1,
          helpText: null,
          options: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as never,
      ]);

      const rows = [
        {
          registerNumber: "2024CSE003",
          name: "David",
          programId: "prog_btech",
          batchId: "batch_2024",
          academicPeriodId: "sem_1",
          highSchoolGpa: "not-a-number",
        },
      ];

      const result = await validateStudentImportRows(rows, "registerNumber");

      expect(result.summary.errorRows).toBe(1);
      expect(
        result.rows[0].errors.some((e) => e.field === "highSchoolGpa")
      ).toBe(true);
    });
  });
});
