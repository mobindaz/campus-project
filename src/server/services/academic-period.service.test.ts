import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listAcademicPeriodsService,
  generateDefaultPeriodsService,
  reorderAcademicPeriodsService,
} from "./academic-period.service";
import * as periodRepository from "@/server/repositories/academic-period.repository";
import * as programRepository from "@/server/repositories/program.repository";
import * as rbacService from "@/server/services/rbac.service";
import { ForbiddenError, UnauthorizedError } from "@/server/errors/app-error";

vi.mock("@/server/repositories/academic-period.repository", () => ({
  listAcademicPeriodsByProgram: vi.fn(),
  findAcademicPeriodById: vi.fn(),
  createAcademicPeriod: vi.fn(),
  createManyAcademicPeriods: vi.fn(),
  updateAcademicPeriod: vi.fn(),
  reorderAcademicPeriods: vi.fn(),
  countAcademicPeriodReferences: vi.fn(),
  deactivateAcademicPeriod: vi.fn(),
  deleteAcademicPeriod: vi.fn(),
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

describe("Academic Period Service", () => {
  const adminUser = {
    id: "user_admin",
    name: "Admin User",
    email: "admin@college.edu",
  };
  const regularUser = {
    id: "user_student",
    name: "Student User",
    email: "student@college.edu",
  };

  const mockDepartment = {
    id: "dept_cse",
    name: "Computer Science & Engineering",
    code: "CSE",
    type: "ACADEMIC" as const,
    description: "CSE Dept",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProgram = {
    id: "prog_btech",
    name: "B.Tech CSE",
    code: "BTECH_CSE",
    shortName: "B.Tech CSE",
    type: "DEGREE" as const,
    durationYears: 4,
    departmentId: "dept_cse",
    department: mockDepartment,
    isActive: true,
    customFields: {},
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

  const mockStudentRole = {
    id: "r2",
    name: "Student",
    code: "student",
    description: "Student role",
    isSystem: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(programRepository.findProgramById).mockResolvedValue(mockProgram);
  });

  describe("Authorization & Validation", () => {
    it("throws UnauthorizedError when user is missing", async () => {
      await expect(
        listAcademicPeriodsService(null, "prog_btech")
      ).rejects.toThrow(UnauthorizedError);
    });

    it("throws ForbiddenError when user lacks permission", async () => {
      vi.mocked(programRepository.findProgramById).mockResolvedValue(
        mockProgram
      );
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockStudentRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([]);
      vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([]);

      await expect(
        listAcademicPeriodsService(regularUser, "prog_btech")
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("Dynamic Period Generation (6 Semesters vs 3 Years)", () => {
    beforeEach(() => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockAdminRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([]);
      vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([]);
    });

    it("generates 6 Semester periods for a Diploma program", async () => {
      vi.mocked(programRepository.findProgramById).mockResolvedValue(
        mockProgram
      );
      vi.mocked(
        periodRepository.listAcademicPeriodsByProgram
      ).mockResolvedValue([]);

      await generateDefaultPeriodsService(adminUser, {
        programId: "prog_btech",
        pattern: "SEMESTER",
        count: 6,
      });

      expect(periodRepository.createManyAcademicPeriods).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: "Semester 1",
            code: "SEM_1",
            orderIndex: 1,
          }),
          expect.objectContaining({
            name: "Semester 6",
            code: "SEM_6",
            orderIndex: 6,
          }),
        ])
      );
    });

    it("generates 3 Year periods for a BA program", async () => {
      vi.mocked(programRepository.findProgramById).mockResolvedValue(
        mockProgram
      );
      vi.mocked(
        periodRepository.listAcademicPeriodsByProgram
      ).mockResolvedValue([]);

      await generateDefaultPeriodsService(adminUser, {
        programId: "prog_btech",
        pattern: "YEAR",
        count: 3,
      });

      expect(periodRepository.createManyAcademicPeriods).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: "Year 1",
            code: "YR_1",
            orderIndex: 1,
          }),
          expect.objectContaining({
            name: "Year 3",
            code: "YR_3",
            orderIndex: 3,
          }),
        ])
      );
    });
  });

  describe("Reordering Academic Periods", () => {
    it("reorders academic period list by orderIndex", async () => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockAdminRole]);
      vi.mocked(programRepository.findProgramById).mockResolvedValue(
        mockProgram
      );

      await reorderAcademicPeriodsService(adminUser, {
        programId: "prog_btech",
        orderedIds: ["period_2", "period_1"],
      });

      expect(periodRepository.reorderAcademicPeriods).toHaveBeenCalledWith(
        "prog_btech",
        ["period_2", "period_1"]
      );
    });
  });
});
