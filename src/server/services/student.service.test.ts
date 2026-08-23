import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listStudentsService,
  listStudentsPaginatedService,
  getStudentByIdService,
  createStudentService,
  updateStudentService,
  toggleStudentStatusService,
  deleteStudentService,
  exportStudentsCsvService,
} from "./student.service";
import * as studentRepo from "@/server/repositories/student.repository";
import * as programRepo from "@/server/repositories/program.repository";
import * as departmentRepo from "@/server/repositories/department.repository";
import * as batchRepo from "@/server/repositories/batch.repository";
import * as academicPeriodRepo from "@/server/repositories/academic-period.repository";
import * as customFieldRepo from "@/server/repositories/custom-field.repository";
import * as rbacService from "@/server/services/rbac.service";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/server/errors/app-error";
import type {
  Role,
  Department,
  Program,
  Batch,
  AcademicPeriod,
  CustomFieldDefinition,
} from "@prisma/client";
import type { StudentWithRelations } from "@/server/repositories/student.repository";

vi.mock("@/server/repositories/student.repository", () => ({
  findStudentById: vi.fn(),
  findStudentByRegisterNumber: vi.fn(),
  findStudentByEmail: vi.fn(),
  findStudentByRegisterNumberExcludeId: vi.fn(),
  findStudentByEmailExcludeId: vi.fn(),
  listStudents: vi.fn(),
  listStudentsPaginated: vi.fn(),
  countStudents: vi.fn(),
  countStudentReferences: vi.fn(),
  createStudent: vi.fn(),
  updateStudent: vi.fn(),
  deactivateStudent: vi.fn(),
  deleteStudent: vi.fn(),
  buildStudentWhereInput: vi.fn((filters) => filters),
}));

vi.mock("@/server/repositories/program.repository", () => ({
  findProgramById: vi.fn(),
}));

vi.mock("@/server/repositories/department.repository", () => ({
  findDepartmentById: vi.fn(),
}));

vi.mock("@/server/repositories/batch.repository", () => ({
  findBatchById: vi.fn(),
}));

vi.mock("@/server/repositories/academic-period.repository", () => ({
  findAcademicPeriodById: vi.fn(),
}));

vi.mock("@/server/repositories/custom-field.repository", () => ({
  listCustomFieldDefinitions: vi.fn(),
}));

vi.mock("@/server/services/rbac.service", () => ({
  getUserRoles: vi.fn(),
  getUserPermissions: vi.fn(),
  getUserDepartmentScopes: vi.fn(),
}));

vi.mock("@/server/services/audit.service", () => ({
  logAudit: vi.fn().mockResolvedValue(true),
}));

describe("Student Service Layer", () => {
  const adminUser = {
    id: "user_admin",
    name: "College Admin",
    email: "admin@college.edu",
  };

  const hodUser = {
    id: "user_hod_cse",
    name: "Dr. Alan Turing",
    email: "hod.cse@college.edu",
  };

  const studentUserWithoutPerms = {
    id: "user_student",
    name: "Student",
    email: "student@college.edu",
  };

  const mockAdminRole = {
    id: "role_admin",
    name: "College Admin",
    code: "college_admin",
    isActive: true,
  } as unknown as Role;

  const mockHodRole = {
    id: "role_hod",
    name: "HOD",
    code: "hod",
    isActive: true,
  } as unknown as Role;

  const mockStudentRole = {
    id: "role_student",
    name: "Student",
    code: "student",
    isActive: true,
  } as unknown as Role;

  const mockCseDept = {
    id: "dept_cse",
    name: "Computer Science & Engineering",
    code: "CSE",
  } as unknown as Department;

  const mockMechDept = {
    id: "dept_mech",
    name: "Mechanical Engineering",
    code: "MECH",
  } as unknown as Department;

  const mockProgram = {
    id: "prog_btech",
    name: "Bachelor of Technology",
    code: "BTECH",
    shortName: "B.Tech",
  } as unknown as Program;

  const mockBatch = {
    id: "batch_2026",
    name: "2022-2026",
    code: "BTECH-22-26",
  } as unknown as Batch;

  const mockAcademicPeriod = {
    id: "period_sem6",
    name: "Semester 6",
    code: "SEM6",
  } as unknown as AcademicPeriod;

  const mockStudent = {
    id: "student_1",
    registerNumber: "2026CSE001",
    name: "John Doe",
    email: "john.doe@college.edu",
    phone: "+91 9876543210",
    dateOfBirth: new Date("2004-05-15"),
    programId: "prog_btech",
    departmentId: "dept_cse",
    batchId: "batch_2026",
    academicPeriodId: "period_sem6",
    isActive: true,
    customFields: {
      parentPhone: "+91 9123456780",
    },
    program: mockProgram,
    department: mockCseDept,
    batch: mockBatch,
    academicPeriod: mockAcademicPeriod,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as StudentWithRelations;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication & RBAC Authorization Checks", () => {
    it("throws UnauthorizedError when session user is missing", async () => {
      await expect(listStudentsService(null)).rejects.toThrow(
        UnauthorizedError
      );
      await expect(
        createStudentService(null, {
          registerNumber: "2026CSE002",
          name: "Alice",
          programId: "prog_btech",
          batchId: "batch_2026",
          academicPeriodId: "period_sem6",
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it("throws ForbiddenError when user lacks students.read permission", async () => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockStudentRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([]);
      vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([]);

      await expect(
        listStudentsService(studentUserWithoutPerms)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("Department Scope Enforcement (§43)", () => {
    it("allows Global Admin (college_admin) to see all students across departments", async () => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockAdminRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([
        "students.read",
        "students.create",
      ]);
      vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([]);
      vi.mocked(studentRepo.listStudents).mockResolvedValue([mockStudent]);

      const result = await listStudentsService(adminUser);
      expect(result).toHaveLength(1);
      expect(studentRepo.listStudents).toHaveBeenCalled();
    });

    it("automatically scopes list query to HOD department", async () => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockHodRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([
        "students.read",
      ]);
      vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([
        mockCseDept,
      ]);
      vi.mocked(studentRepo.listStudents).mockResolvedValue([mockStudent]);

      const result = await listStudentsService(hodUser);
      expect(result).toHaveLength(1);
      expect(studentRepo.listStudents).toHaveBeenCalledWith(
        expect.objectContaining({
          departmentId: ["dept_cse"],
        })
      );
    });

    it("prevents HOD from querying another department via explicit filter", async () => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockHodRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([
        "students.read",
      ]);
      vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([
        mockCseDept,
      ]);

      await expect(
        listStudentsService(hodUser, { departmentId: "dept_mech" })
      ).rejects.toThrow(ForbiddenError);
    });

    it("allows HOD to query their own department explicitly", async () => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockHodRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([
        "students.read",
      ]);
      vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([
        mockCseDept,
      ]);
      vi.mocked(studentRepo.listStudents).mockResolvedValue([mockStudent]);

      const result = await listStudentsService(hodUser, {
        departmentId: "dept_cse",
      });
      expect(result).toHaveLength(1);
    });

    it("blocks HOD from fetching a single student belonging to another department", async () => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockHodRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([
        "students.read",
      ]);
      vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([
        mockCseDept,
      ]);

      const mechStudent = {
        ...mockStudent,
        id: "student_mech_1",
        departmentId: "dept_mech",
        department: mockMechDept,
      } as unknown as StudentWithRelations;

      vi.mocked(studentRepo.findStudentById).mockResolvedValue(mechStudent);

      await expect(
        getStudentByIdService(hodUser, "student_mech_1")
      ).rejects.toThrow(ForbiddenError);
    });

    it("blocks HOD from creating a student in another department", async () => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockHodRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([
        "students.create",
      ]);
      vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([
        mockCseDept,
      ]);

      await expect(
        createStudentService(hodUser, {
          registerNumber: "2026MECH001",
          name: "Mech Student",
          programId: "prog_btech",
          departmentId: "dept_mech",
          batchId: "batch_2026",
          academicPeriodId: "period_sem6",
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("Student Creation (createStudentService)", () => {
    beforeEach(() => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockAdminRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([
        "students.create",
      ]);
      vi.mocked(programRepo.findProgramById).mockResolvedValue(
        mockProgram as never
      );
      vi.mocked(departmentRepo.findDepartmentById).mockResolvedValue(
        mockCseDept as never
      );
      vi.mocked(batchRepo.findBatchById).mockResolvedValue(mockBatch as never);
      vi.mocked(academicPeriodRepo.findAcademicPeriodById).mockResolvedValue(
        mockAcademicPeriod as never
      );
      vi.mocked(customFieldRepo.listCustomFieldDefinitions).mockResolvedValue(
        []
      );
    });

    it("creates a new student successfully", async () => {
      vi.mocked(studentRepo.findStudentByRegisterNumber).mockResolvedValue(
        null
      );
      vi.mocked(studentRepo.findStudentByEmail).mockResolvedValue(null);
      vi.mocked(studentRepo.createStudent).mockResolvedValue(mockStudent);

      const created = await createStudentService(adminUser, {
        registerNumber: "2026CSE001",
        name: "John Doe",
        email: "john.doe@college.edu",
        phone: "+91 9876543210",
        programId: "prog_btech",
        departmentId: "dept_cse",
        batchId: "batch_2026",
        academicPeriodId: "period_sem6",
      });

      expect(created.registerNumber).toBe("2026CSE001");
      expect(studentRepo.createStudent).toHaveBeenCalled();
    });

    it("rejects duplicate registerNumber with ValidationError", async () => {
      vi.mocked(studentRepo.findStudentByRegisterNumber).mockResolvedValue(
        mockStudent
      );

      await expect(
        createStudentService(adminUser, {
          registerNumber: "2026CSE001",
          name: "Duplicate John",
          programId: "prog_btech",
          departmentId: "dept_cse",
          batchId: "batch_2026",
          academicPeriodId: "period_sem6",
        })
      ).rejects.toThrow(ValidationError);
    });

    it("rejects duplicate email with ValidationError", async () => {
      vi.mocked(studentRepo.findStudentByRegisterNumber).mockResolvedValue(
        null
      );
      vi.mocked(studentRepo.findStudentByEmail).mockResolvedValue(mockStudent);

      await expect(
        createStudentService(adminUser, {
          registerNumber: "2026CSE002",
          name: "Another John",
          email: "john.doe@college.edu",
          programId: "prog_btech",
          departmentId: "dept_cse",
          batchId: "batch_2026",
          academicPeriodId: "period_sem6",
        })
      ).rejects.toThrow(ValidationError);
    });

    it("validates that the referenced academic program exists", async () => {
      vi.mocked(studentRepo.findStudentByRegisterNumber).mockResolvedValue(
        null
      );
      vi.mocked(programRepo.findProgramById).mockResolvedValue(null);

      await expect(
        createStudentService(adminUser, {
          registerNumber: "2026CSE003",
          name: "Invalid Program Student",
          programId: "prog_invalid",
          batchId: "batch_2026",
          academicPeriodId: "period_sem6",
        })
      ).rejects.toThrow(NotFoundError);
    });

    it("validates required custom fields from Phase 3 engine", async () => {
      vi.mocked(studentRepo.findStudentByRegisterNumber).mockResolvedValue(
        null
      );
      vi.mocked(customFieldRepo.listCustomFieldDefinitions).mockResolvedValue([
        {
          id: "cf_1",
          name: "bloodGroup",
          label: "Blood Group",
          type: "TEXT",
          required: true,
          isActive: true,
          visibility: "ALL",
          order: 1,
          entityType: "STUDENT",
          unique: false,
          defaultValue: null,
          validation: null,
          helpText: null,
          options: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as CustomFieldDefinition,
      ]);

      await expect(
        createStudentService(adminUser, {
          registerNumber: "2026CSE004",
          name: "Missing Custom Field",
          programId: "prog_btech",
          batchId: "batch_2026",
          academicPeriodId: "period_sem6",
          customFields: {},
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("Student Update (updateStudentService)", () => {
    beforeEach(() => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockAdminRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([
        "students.update",
      ]);
      vi.mocked(studentRepo.findStudentById).mockResolvedValue(mockStudent);
      vi.mocked(customFieldRepo.listCustomFieldDefinitions).mockResolvedValue(
        []
      );
    });

    it("updates student details cleanly", async () => {
      vi.mocked(studentRepo.updateStudent).mockResolvedValue({
        ...mockStudent,
        name: "Johnathan Doe",
      } as unknown as StudentWithRelations);

      const updated = await updateStudentService(adminUser, "student_1", {
        name: "Johnathan Doe",
      });

      expect(updated.name).toBe("Johnathan Doe");
      expect(studentRepo.updateStudent).toHaveBeenCalled();
    });

    it("throws ValidationError on duplicate registerNumber during update", async () => {
      vi.mocked(
        studentRepo.findStudentByRegisterNumberExcludeId
      ).mockResolvedValue({
        ...mockStudent,
        id: "student_2",
        registerNumber: "2026CSE099",
      } as unknown as StudentWithRelations);

      await expect(
        updateStudentService(adminUser, "student_1", {
          registerNumber: "2026CSE099",
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("Student Status Toggle (toggleStudentStatusService)", () => {
    beforeEach(() => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockAdminRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([
        "students.update",
      ]);
      vi.mocked(studentRepo.findStudentById).mockResolvedValue(mockStudent);
    });

    it("toggles active status from true to false", async () => {
      vi.mocked(studentRepo.updateStudent).mockResolvedValue({
        ...mockStudent,
        isActive: false,
      } as unknown as StudentWithRelations);

      const result = await toggleStudentStatusService(
        adminUser,
        "student_1",
        false
      );
      expect(result.isActive).toBe(false);
      expect(studentRepo.updateStudent).toHaveBeenCalledWith("student_1", {
        isActive: false,
      });
    });
  });

  describe("Correction #8: Safe Deletion Rule (deleteStudentService)", () => {
    beforeEach(() => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockAdminRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([
        "students.delete",
      ]);
      vi.mocked(studentRepo.findStudentById).mockResolvedValue(mockStudent);
    });

    it("hard deletes student record when references count is 0", async () => {
      vi.mocked(studentRepo.countStudentReferences).mockResolvedValue(0);
      vi.mocked(studentRepo.deleteStudent).mockResolvedValue(mockStudent);

      const result = await deleteStudentService(adminUser, "student_1");
      expect(result.mode).toBe("DELETED");
      expect(studentRepo.deleteStudent).toHaveBeenCalledWith("student_1");
      expect(studentRepo.deactivateStudent).not.toHaveBeenCalled();
    });

    it("force deactivates student record when foreign references exist", async () => {
      vi.mocked(studentRepo.countStudentReferences).mockResolvedValue(3);
      vi.mocked(studentRepo.deactivateStudent).mockResolvedValue({
        ...mockStudent,
        isActive: false,
      } as unknown as StudentWithRelations);

      const result = await deleteStudentService(adminUser, "student_1");
      expect(result.mode).toBe("DEACTIVATED");
      expect(studentRepo.deactivateStudent).toHaveBeenCalledWith("student_1");
      expect(studentRepo.deleteStudent).not.toHaveBeenCalled();
    });
  });

  describe("Pagination & CSV Export", () => {
    beforeEach(() => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockAdminRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([
        "students.read",
      ]);
    });

    it("calculates totalPages accurately in listStudentsPaginatedService", async () => {
      vi.mocked(studentRepo.listStudentsPaginated).mockResolvedValue({
        data: [mockStudent],
        total: 25,
      });

      const result = await listStudentsPaginatedService(adminUser, {
        page: 2,
        pageSize: 10,
        search: "",
        sortField: "registerNumber",
        sortDirection: "asc",
        filters: {},
        visibleColumns: [],
      });

      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.page).toBe(2);
    });

    it("exports filtered students as CSV formatted string", async () => {
      vi.mocked(studentRepo.listStudents).mockResolvedValue([mockStudent]);

      const csv = await exportStudentsCsvService(adminUser, {
        page: 1,
        pageSize: 10,
        search: "",
        sortField: "registerNumber",
        sortDirection: "asc",
        filters: {},
        visibleColumns: [],
      });

      expect(csv).toContain("Register Number");
      expect(csv).toContain("2026CSE001");
      expect(csv).toContain("John Doe");
    });
  });
});
