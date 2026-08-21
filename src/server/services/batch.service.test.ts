import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBatchService } from "./batch.service";
import * as batchRepository from "@/server/repositories/batch.repository";
import * as programRepository from "@/server/repositories/program.repository";
import * as rbacService from "@/server/services/rbac.service";
import { ValidationError } from "@/server/errors/app-error";

vi.mock("@/server/repositories/batch.repository", () => ({
  listBatches: vi.fn(),
  findBatchById: vi.fn(),
  findBatchByCode: vi.fn(),
  countBatchReferences: vi.fn(),
  createBatch: vi.fn(),
  updateBatch: vi.fn(),
  deactivateBatch: vi.fn(),
  deleteBatch: vi.fn(),
}));

vi.mock("@/server/repositories/program.repository", () => ({
  findProgramById: vi.fn(),
}));

vi.mock("@/server/services/rbac.service", () => ({
  getUserRoles: vi.fn(),
  getUserPermissions: vi.fn(),
  getUserDepartmentScopes: vi.fn(),
}));

vi.mock("@/server/services/audit.service", () => ({
  logAudit: vi.fn().mockResolvedValue(true),
}));

describe("Batch Service Layer", () => {
  const adminUser = {
    id: "user_admin",
    name: "Admin User",
    email: "admin@college.edu",
  };

  const mockProgram = {
    id: "prog_btech",
    name: "Bachelor of Technology",
    code: "BTECH",
    shortName: "B.Tech",
    type: "DEGREE" as const,
    durationYears: 4,
    departments: [
      {
        id: "dept_cse",
        name: "Computer Science",
        code: "CSE",
        type: "ACADEMIC" as const,
        description: "CSE Dept",
        programId: "prog_btech",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    isActive: true,
    customFields: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBatch = {
    id: "batch_2024",
    name: "2024-2028 Batch A",
    code: "B2024_A",
    academicYear: "2024-2028",
    admissionYear: 2024,
    graduationYear: 2028,
    section: "A",
    programId: "prog_btech",
    departmentId: "dept_cse",
    program: mockProgram,
    department: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdminRole = {
    id: "r1",
    name: "College Admin",
    code: "college_admin",
    description: "Full admin",
    isSystem: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Batch Creation & Validation", () => {
    beforeEach(() => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockAdminRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([]);
      vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([]);
    });

    it("creates a batch when valid program and years are provided", async () => {
      vi.mocked(programRepository.findProgramById).mockResolvedValue(
        mockProgram
      );
      vi.mocked(batchRepository.findBatchByCode).mockResolvedValue(null);
      vi.mocked(batchRepository.createBatch).mockResolvedValue(mockBatch);

      const result = await createBatchService(adminUser, {
        name: "2024-2028 Batch A",
        code: "b2024_a",
        academicYear: "2024-2028",
        admissionYear: 2024,
        graduationYear: 2028,
        section: "A",
        programId: "prog_btech",
        isActive: true,
      });

      expect(result.code).toBe("B2024_A");
      expect(batchRepository.createBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          academicYear: "2024-2028",
          admissionYear: 2024,
          graduationYear: 2028,
        })
      );
    });

    it("throws ValidationError when graduationYear < admissionYear", async () => {
      await expect(
        createBatchService(adminUser, {
          name: "Invalid Batch",
          code: "INVALID",
          academicYear: "2024-2022",
          admissionYear: 2024,
          graduationYear: 2022,
          programId: "prog_btech",
          isActive: true,
        })
      ).rejects.toThrow(ValidationError);
    });
  });
});
