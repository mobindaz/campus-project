import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  executeStudentImportService,
  listImportHistoryService,
  getImportHistoryByIdService,
} from "./import-execution.service";

// Mock repositories
vi.mock("@/server/repositories/student.repository", () => ({
  upsertStudentByRegisterNumber: vi.fn(),
  upsertStudentByEmail: vi.fn(),
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

import * as studentRepo from "@/server/repositories/student.repository";
import * as historyRepo from "@/server/repositories/import-history.repository";

describe("Import Execution Service (Correction #9 & Spec §20)", () => {
  const mockUser = {
    id: "user_admin",
    name: "Admin User",
    email: "admin@college.edu",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(historyRepo.createImportHistory).mockResolvedValue({
      id: "import_hist_1",
      entityType: "STUDENT",
      fileName: "students.xlsx",
      fileSize: 1024,
      uploadedById: mockUser.id,
      uploadedBy: mockUser.email,
      matchingKey: "registerNumber",
      totalRows: 3,
      createdCount: 2,
      updatedCount: 0,
      skippedCount: 1,
      errorCount: 1,
      status: "PARTIAL",
      errors: [],
      metadata: {},
      createdAt: new Date(),
    });
  });

  describe("executeStudentImportService", () => {
    it("TEST CRITERION: imports valid rows and isolates 1 broken row without rolling back the batch", async () => {
      // Setup: 3 rows -> Row 1 valid (created), Row 2 broken (throws error), Row 3 valid (created)
      const rows = [
        {
          rowNumber: 2,
          action: "CREATE",
          registerNumber: "2024CSE001",
          name: "Alice Smith",
          programId: "prog_btech",
          batchId: "batch_2024",
          academicPeriodId: "sem_1",
        },
        {
          rowNumber: 3,
          action: "CREATE",
          registerNumber: "BROKEN_ROW",
          name: "Bob Broken",
          programId: "prog_btech",
          batchId: "batch_2024",
          academicPeriodId: "sem_1",
        },
        {
          rowNumber: 4,
          action: "CREATE",
          registerNumber: "2024CSE002",
          name: "Charlie Brown",
          programId: "prog_btech",
          batchId: "batch_2024",
          academicPeriodId: "sem_1",
        },
      ];

      vi.mocked(studentRepo.upsertStudentByRegisterNumber)
        .mockResolvedValueOnce({
          student: { id: "s1" } as never,
          created: true,
        })
        .mockRejectedValueOnce(
          new Error("Unique constraint violation on student email")
        )
        .mockResolvedValueOnce({
          student: { id: "s3" } as never,
          created: true,
        });

      const result = await executeStudentImportService(mockUser, {
        entityType: "STUDENT",
        fileName: "students.xlsx",
        rows,
        matchingStrategy: "registerNumber",
        chunkSize: 200,
      });

      // Verification of Row-Level Error Isolation:
      // Row 1 and Row 3 were imported successfully (createdCount = 2)
      // Row 2 threw error and was caught (errorCount = 1)
      expect(result.createdCount).toBe(2);
      expect(result.errorCount).toBe(1);
      expect(result.failedRows).toHaveLength(1);
      expect(result.failedRows[0].rowNumber).toBe(3);
      expect(result.failedRows[0].error).toContain(
        "Unique constraint violation"
      );
      expect(result.success).toBe(true); // Partial success

      // Verified upsert was attempted for all 3 rows despite row 2 error
      expect(studentRepo.upsertStudentByRegisterNumber).toHaveBeenCalledTimes(
        3
      );

      // Verify audit history creation
      expect(historyRepo.createImportHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: "students.xlsx",
          createdCount: 2,
          errorCount: 1,
          status: "PARTIAL",
        })
      );
    });

    it("handles updating existing students and skips rows marked as SKIP", async () => {
      const rows = [
        {
          rowNumber: 2,
          action: "UPDATE",
          registerNumber: "2024CSE001",
          name: "Alice Updated",
          programId: "prog_btech",
          batchId: "batch_2024",
          academicPeriodId: "sem_1",
        },
        {
          rowNumber: 3,
          action: "SKIP", // Validation error row
          registerNumber: "",
          name: "Invalid",
        },
      ];

      vi.mocked(
        studentRepo.upsertStudentByRegisterNumber
      ).mockResolvedValueOnce({
        student: { id: "s1" } as never,
        created: false,
      });

      const result = await executeStudentImportService(mockUser, {
        entityType: "STUDENT",
        fileName: "update.xlsx",
        rows,
        matchingStrategy: "registerNumber",
      });

      expect(result.updatedCount).toBe(1);
      expect(result.skippedCount).toBe(1);
      expect(studentRepo.upsertStudentByRegisterNumber).toHaveBeenCalledTimes(
        1
      );
    });
  });

  describe("listImportHistoryService & getImportHistoryByIdService", () => {
    it("lists import history records", async () => {
      vi.mocked(historyRepo.listImportHistories).mockResolvedValue([
        {
          id: "hist_1",
          entityType: "STUDENT",
          fileName: "file.xlsx",
          fileSize: 500,
          uploadedById: "u1",
          uploadedBy: "admin@college.edu",
          matchingKey: "registerNumber",
          totalRows: 10,
          createdCount: 10,
          updatedCount: 0,
          skippedCount: 0,
          errorCount: 0,
          status: "COMPLETED",
          errors: [],
          metadata: {},
          createdAt: new Date(),
        },
      ]);

      const list = await listImportHistoryService(mockUser, "STUDENT");
      expect(list).toHaveLength(1);
      expect(list[0].fileName).toBe("file.xlsx");
    });

    it("gets import history by ID", async () => {
      vi.mocked(historyRepo.findImportHistoryById).mockResolvedValue({
        id: "hist_1",
        entityType: "STUDENT",
        fileName: "file.xlsx",
        fileSize: 500,
        uploadedById: "u1",
        uploadedBy: "admin@college.edu",
        matchingKey: "registerNumber",
        totalRows: 10,
        createdCount: 10,
        updatedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        status: "COMPLETED",
        errors: [],
        metadata: {},
        createdAt: new Date(),
      });

      const record = await getImportHistoryByIdService(mockUser, "hist_1");
      expect(record?.id).toBe("hist_1");
    });
  });
});
