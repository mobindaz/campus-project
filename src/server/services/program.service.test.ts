import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listProgramsService,
  getProgramByIdService,
  createProgramService,
  updateProgramService,
  deactivateProgramService,
  deleteProgramService,
} from "./program.service";
import * as programRepository from "@/server/repositories/program.repository";
import * as departmentRepository from "@/server/repositories/department.repository";
import * as rbacService from "@/server/services/rbac.service";
import { ForbiddenError, UnauthorizedError, ValidationError } from "@/server/errors/app-error";

vi.mock("@/server/repositories/program.repository", () => ({
  listPrograms: vi.fn(),
  findProgramById: vi.fn(),
  findProgramByCode: vi.fn(),
  findProgramByName: vi.fn(),
  countProgramReferences: vi.fn(),
  createProgram: vi.fn(),
  updateProgram: vi.fn(),
  deactivateProgram: vi.fn(),
  deleteProgram: vi.fn(),
}));

vi.mock("@/server/repositories/department.repository", () => ({
  findDepartmentById: vi.fn(),
}));

vi.mock("@/server/services/rbac.service", () => ({
  getUserRoles: vi.fn(),
  getUserPermissions: vi.fn(),
  getUserDepartmentScopes: vi.fn(),
}));

vi.mock("@/server/services/audit.service", () => ({
  logAudit: vi.fn().mockResolvedValue(true),
}));

describe("Program Service Layer", () => {
  const adminUser = { id: "user_admin", name: "Admin User", email: "admin@college.edu" };
  const regularUser = { id: "user_student", name: "Student User", email: "student@college.edu" };

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
    id: "prog_1",
    name: "Bachelor of Technology in Computer Science",
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
  });

  describe("Authorization enforcement", () => {
    it("throws UnauthorizedError when user is missing", async () => {
      await expect(listProgramsService(null)).rejects.toThrow(UnauthorizedError);
      await expect(
        createProgramService(null, {
          name: "Test",
          code: "TEST",
          shortName: "Test Short",
          type: "DEGREE",
          durationYears: 4,
          departmentId: "dept_cse",
          isActive: true,
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it("throws ForbiddenError when non-admin user lacks permission", async () => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockStudentRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([]);
      vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([]);

      await expect(listProgramsService(regularUser)).rejects.toThrow(ForbiddenError);
    });

    it("allows College Admin access and filters by department", async () => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockAdminRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([]);
      vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([]);
      vi.mocked(programRepository.listPrograms).mockResolvedValue([mockProgram]);

      const programs = await listProgramsService(adminUser, { departmentId: "dept_cse" });
      expect(programs).toHaveLength(1);
      expect(programRepository.listPrograms).toHaveBeenCalledWith(
        expect.objectContaining({ departmentId: "dept_cse" })
      );
    });
  });

  describe("Program Creation & Department Validation", () => {
    beforeEach(() => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockAdminRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([]);
      vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([]);
    });

    it("throws ValidationError when specified departmentId does not exist", async () => {
      vi.mocked(departmentRepository.findDepartmentById).mockResolvedValue(null);

      await expect(
        createProgramService(adminUser, {
          name: "B.Tech CSE",
          code: "BTECH_CSE",
          shortName: "B.Tech CSE",
          type: "DEGREE",
          durationYears: 4,
          departmentId: "non_existent_dept",
          isActive: true,
        })
      ).rejects.toThrow(ValidationError);
    });

    it("creates program when department exists and program code/name are unique", async () => {
      vi.mocked(departmentRepository.findDepartmentById).mockResolvedValue(mockDepartment);
      vi.mocked(programRepository.findProgramByCode).mockResolvedValue(null);
      vi.mocked(programRepository.findProgramByName).mockResolvedValue(null);
      vi.mocked(programRepository.createProgram).mockResolvedValue(mockProgram);

      const result = await createProgramService(adminUser, {
        name: "Bachelor of Technology in Computer Science",
        code: "btech_cse",
        shortName: "B.Tech CSE",
        type: "DEGREE",
        durationYears: 4,
        departmentId: "dept_cse",
        isActive: true,
      });

      expect(result.code).toBe("BTECH_CSE");
      expect(programRepository.createProgram).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Bachelor of Technology in Computer Science",
          code: "BTECH_CSE",
          type: "DEGREE",
          durationYears: 4,
        })
      );
    });
  });

  describe("Deletion vs Deactivation Guard", () => {
    beforeEach(() => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockAdminRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([]);
      vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([]);
    });

    it("performs hard delete when reference count is 0", async () => {
      vi.mocked(programRepository.findProgramById).mockResolvedValue(mockProgram);
      vi.mocked(programRepository.countProgramReferences).mockResolvedValue(0);
      vi.mocked(programRepository.deleteProgram).mockResolvedValue(mockProgram);

      const result = await deleteProgramService(adminUser, "prog_1");
      expect(result.mode).toBe("DELETED");
      expect(programRepository.deleteProgram).toHaveBeenCalledWith("prog_1");
    });
  });
});
