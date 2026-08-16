import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listDepartmentsService,
  getDepartmentByIdService,
  createDepartmentService,
  updateDepartmentService,
  deactivateDepartmentService,
  deleteDepartmentService,
} from "./department.service";
import * as departmentRepository from "@/server/repositories/department.repository";
import * as rbacService from "@/server/services/rbac.service";
import { ForbiddenError, UnauthorizedError, ValidationError } from "@/server/errors/app-error";

vi.mock("@/server/repositories/department.repository", () => ({
  listDepartments: vi.fn(),
  findDepartmentById: vi.fn(),
  findDepartmentByCode: vi.fn(),
  findDepartmentByName: vi.fn(),
  countDepartmentReferences: vi.fn(),
  createDepartment: vi.fn(),
  updateDepartment: vi.fn(),
  deactivateDepartment: vi.fn(),
  deleteDepartment: vi.fn(),
}));

vi.mock("@/server/services/rbac.service", () => ({
  getUserRoles: vi.fn(),
  getUserPermissions: vi.fn(),
  getUserDepartmentScopes: vi.fn(),
}));

vi.mock("@/server/services/audit.service", () => ({
  logAudit: vi.fn().mockResolvedValue(true),
}));

describe("Department Service Layer", () => {
  const adminUser = { id: "user_admin", name: "Admin User", email: "admin@college.edu" };
  const regularUser = { id: "user_student", name: "Student User", email: "student@college.edu" };

  const mockDepartment = {
    id: "dept_1",
    name: "Computer Science & Engineering",
    code: "CSE",
    type: "ACADEMIC" as const,
    description: "CSE Department",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdminRole = {
    id: "r1",
    name: "College Admin",
    code: "college_admin",
    description: "Full system administration access",
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
      await expect(listDepartmentsService(null)).rejects.toThrow(UnauthorizedError);
      await expect(
        createDepartmentService(null, { name: "Test", code: "TEST", type: "ACADEMIC", description: "", isActive: true })
      ).rejects.toThrow(UnauthorizedError);
    });

    it("throws ForbiddenError when non-admin user lacks permission", async () => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockStudentRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([]);
      vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([]);

      await expect(listDepartmentsService(regularUser)).rejects.toThrow(ForbiddenError);
      await expect(
        createDepartmentService(regularUser, { name: "Test", code: "TEST", type: "ACADEMIC", description: "", isActive: true })
      ).rejects.toThrow(ForbiddenError);
    });

    it("allows College Admin global role access", async () => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockAdminRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([]);
      vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([]);
      vi.mocked(departmentRepository.listDepartments).mockResolvedValue([mockDepartment]);

      const depts = await listDepartmentsService(adminUser);
      expect(depts).toHaveLength(1);
      expect(depts[0].code).toBe("CSE");
    });
  });

  describe("Department Creation & Validation", () => {
    beforeEach(() => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockAdminRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([]);
      vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([]);
    });

    it("creates a department when code and name are unique", async () => {
      vi.mocked(departmentRepository.findDepartmentByCode).mockResolvedValue(null);
      vi.mocked(departmentRepository.findDepartmentByName).mockResolvedValue(null);
      vi.mocked(departmentRepository.createDepartment).mockResolvedValue(mockDepartment);

      const result = await createDepartmentService(adminUser, {
        name: "Computer Science & Engineering",
        code: "cse",
        type: "ACADEMIC",
        description: "CSE Department",
        isActive: true,
      });

      expect(result.code).toBe("CSE");
      expect(departmentRepository.createDepartment).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Computer Science & Engineering",
          code: "CSE",
          type: "ACADEMIC",
        })
      );
    });

    it("throws ValidationError when department code already exists", async () => {
      vi.mocked(departmentRepository.findDepartmentByCode).mockResolvedValue(mockDepartment);

      await expect(
        createDepartmentService(adminUser, {
          name: "New Department",
          code: "CSE",
          type: "ACADEMIC",
          description: "",
          isActive: true,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("Deletion vs Deactivation guard (Correction #8)", () => {
    beforeEach(() => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockAdminRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([]);
      vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([]);
    });

    it("performs hard delete when reference count is 0", async () => {
      vi.mocked(departmentRepository.findDepartmentById).mockResolvedValue(mockDepartment);
      vi.mocked(departmentRepository.countDepartmentReferences).mockResolvedValue(0);
      vi.mocked(departmentRepository.deleteDepartment).mockResolvedValue(mockDepartment);

      const result = await deleteDepartmentService(adminUser, "dept_1");
      expect(result.mode).toBe("DELETED");
      expect(departmentRepository.deleteDepartment).toHaveBeenCalledWith("dept_1");
    });

    it("performs soft deactivation when references exist (>0)", async () => {
      vi.mocked(departmentRepository.findDepartmentById).mockResolvedValue(mockDepartment);
      vi.mocked(departmentRepository.countDepartmentReferences).mockResolvedValue(3);
      vi.mocked(departmentRepository.deactivateDepartment).mockResolvedValue({
        ...mockDepartment,
        isActive: false,
      });

      const result = await deleteDepartmentService(adminUser, "dept_1");
      expect(result.mode).toBe("DEACTIVATED");
      expect(departmentRepository.deactivateDepartment).toHaveBeenCalledWith("dept_1");
      expect(departmentRepository.deleteDepartment).not.toHaveBeenCalled();
    });
  });
});
