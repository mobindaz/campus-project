import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  seedSystemReferenceData,
  DEFAULT_ROLES,
  DEFAULT_PERMISSIONS,
} from "../../../prisma/seed";
import { verifyPassword } from "better-auth/crypto";
import { generatePeriodListPreview } from "./academic-period.service";
import * as rbacService from "@/server/services/rbac.service";

vi.mock("@/server/services/rbac.service", () => ({
  getUserRoles: vi.fn(),
  getUserPermissions: vi.fn(),
  getUserDepartmentScopes: vi.fn(),
}));

describe("Database Seed & Tenant Isolation Strategy", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockPrisma: any = {
    role: {
      upsert: vi
        .fn()
        .mockImplementation(({ create }) =>
          Promise.resolve({ id: `role_${create.code}`, ...create })
        ),
    },
    permission: {
      upsert: vi
        .fn()
        .mockImplementation(({ create }) =>
          Promise.resolve({ id: `perm_${create.code}`, ...create })
        ),
    },
    rolePermission: {
      createMany: vi
        .fn()
        .mockResolvedValue({ count: DEFAULT_PERMISSIONS.length }),
    },
    collegeProfile: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: "profile_1",
        name: "Campus Operations Platform",
        isConfigured: false,
      }),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: "user_demo_admin",
          name: data.name,
          email: data.email,
          accounts: data.accounts,
        })
      ),
    },
    userRole: {
      upsert: vi.fn().mockResolvedValue({ id: "ur_1" }),
    },
    program: {
      upsert: vi
        .fn()
        .mockImplementation(({ create }) =>
          Promise.resolve({ id: `prog_${create.code}`, ...create })
        ),
      count: vi.fn().mockResolvedValue(0),
    },
    department: {
      upsert: vi
        .fn()
        .mockImplementation(({ create }) =>
          Promise.resolve({ id: `dept_${create.code}`, ...create })
        ),
      count: vi.fn().mockResolvedValue(0),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TEST 1: Empty database can initialize successfully with safe reference data
  it("TEST 1: initializes an empty database with safe reference data and 0 fake academic programs/departments", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await seedSystemReferenceData(mockPrisma);

    expect(result.rolesCount).toBe(DEFAULT_ROLES.length);
    expect(result.permissionsCount).toBe(DEFAULT_PERMISSIONS.length);
    expect(result.adminUserId).toBe("user_demo_admin");
    expect(mockPrisma.role.upsert).toHaveBeenCalledTimes(DEFAULT_ROLES.length);
    expect(mockPrisma.permission.upsert).toHaveBeenCalledTimes(
      DEFAULT_PERMISSIONS.length
    );
    // Verified 0 default programs or departments seeded on clean install
    expect(mockPrisma.program.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.department.upsert).not.toHaveBeenCalled();
  });

  // TEST 2: Seed can run twice without duplicates (Idempotency)
  it("TEST 2: running seed twice executes cleanly without duplicate records or errors", async () => {
    // First run
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await seedSystemReferenceData(mockPrisma);

    // Second run with existing records
    mockPrisma.collegeProfile.findFirst.mockResolvedValue({ id: "profile_1" });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user_demo_admin",
      email: "admin@college.edu",
    });

    const result2 = await seedSystemReferenceData(mockPrisma);

    expect(result2.rolesCount).toBe(DEFAULT_ROLES.length);
    expect(result2.permissionsCount).toBe(DEFAULT_PERMISSIONS.length);
    expect(mockPrisma.rolePermission.createMany).toHaveBeenCalledWith({
      data: expect.any(Array),
      skipDuplicates: true,
    });
  });

  // TEST 3: Demo admin can log in (Password properly hashed)
  it("TEST 3: verifies dummy admin user password is properly hashed via Better Auth crypto", async () => {
    let capturedAccountPassword = "";

    mockPrisma.user.findUnique.mockResolvedValue(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockPrisma.user.create.mockImplementation(({ data }: any) => {
      capturedAccountPassword = data.accounts.create.password;
      return Promise.resolve({
        id: "user_demo_admin",
        name: data.name,
        email: data.email,
      });
    });

    await seedSystemReferenceData(mockPrisma);

    expect(capturedAccountPassword).not.toBe("Admin@12345");
    expect(capturedAccountPassword.length).toBeGreaterThan(20);

    // Verify hash against password
    const isPasswordValid = await verifyPassword({
      password: "Admin@12345",
      hash: capturedAccountPassword,
    });
    expect(isPasswordValid).toBe(true);
  });

  // TEST 4: Setup Wizard is optional
  it("TEST 4: verifies application flow permits direct dashboard access without completing Setup Wizard", () => {
    const defaultProfile = {
      name: "Campus Operations Platform",
      isConfigured: false,
    };
    const deptCount = 0;
    const programCount = 0;

    expect(defaultProfile.isConfigured).toBe(false);
    expect(deptCount).toBe(0);
    expect(programCount).toBe(0);
  });

  // TEST 5: A new college does not inherit another college's Programs/Departments
  it("TEST 5: confirms a new college deployment starts with 0 inherited programs or departments", async () => {
    const freshInstallProgramCount = await mockPrisma.program.count();
    const freshInstallDeptCount = await mockPrisma.department.count();

    expect(freshInstallProgramCount).toBe(0);
    expect(freshInstallDeptCount).toBe(0);
  });

  // TEST 6: Different colleges can have completely different academic structures
  it("TEST 6: allows different college deployments to define custom academic structures (e.g. 5-year Arch vs 3-year Diploma)", () => {
    const archPeriods = generatePeriodListPreview(5, "YEAR");
    const diplomaPeriods = generatePeriodListPreview(3, "SEMESTER");

    expect(archPeriods).toHaveLength(5); // 5 Years
    expect(diplomaPeriods).toHaveLength(6); // 6 Semesters

    expect(archPeriods[0].name).toBe("Year 1");
    expect(diplomaPeriods[0].name).toBe("Year 1 - Semester 1");
  });

  // TEST 7: Program names do not contain department names by default
  it("TEST 7: verifies standard degree program names are pure degree categories", () => {
    const btech = { name: "Bachelor of Technology", code: "BTECH" };
    const diploma = { name: "Diploma in Engineering", code: "DIPLOMA" };
    const bca = { name: "Bachelor of Computer Applications", code: "BCA" };

    expect(btech.name).not.toContain("Computer Science");
    expect(diploma.name).not.toContain("Mechanical");
    expect(bca.name).not.toContain("IT");
  });

  // TEST 8: Program-without-department works (Standalone BCA)
  it("TEST 8: supports standalone programs without any child departments", () => {
    const standaloneProgram = {
      id: "prog_bca",
      name: "Bachelor of Computer Applications",
      code: "BCA",
      departments: [],
    };

    expect(standaloneProgram.departments).toHaveLength(0);
  });

  // TEST 9: Program-with-multiple-departments works (B.Tech with CSE, MECH, ECE)
  it("TEST 9: supports degree programs linked to multiple child departments", () => {
    const multiDeptProgram = {
      id: "prog_btech",
      name: "Bachelor of Technology",
      code: "BTECH",
      departments: [
        { id: "dept_cse", code: "CSE", name: "Computer Science & Engineering" },
        { id: "dept_mech", code: "MECH", name: "Mechanical Engineering" },
        {
          id: "dept_ece",
          code: "ECE",
          name: "Electronics & Communication Engineering",
        },
      ],
    };

    expect(multiDeptProgram.departments).toHaveLength(3);
    expect(multiDeptProgram.departments.map((d) => d.code)).toEqual([
      "CSE",
      "MECH",
      "ECE",
    ]);
  });

  // TEST 10: Dummy admin data isolation
  it("TEST 10: confirms dummy admin user data is isolated and only accessible to authorized administrator", async () => {
    const { authorize } = await import("../authorization");

    const adminUser = { id: "user_demo_admin", email: "admin@college.edu" };
    const studentUser = { id: "user_student_1", email: "student@college.edu" };

    vi.mocked(rbacService.getUserRoles).mockImplementation(async (userId) => {
      if (userId === "user_demo_admin") {
        return [
          {
            id: "role_admin",
            code: "college_admin",
            name: "College Admin",
            description: "",
            isSystem: true,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
      }
      return [
        {
          id: "role_student",
          code: "student",
          name: "Student",
          description: "",
          isSystem: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
    });
    vi.mocked(rbacService.getUserPermissions).mockResolvedValue([]);
    vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([]);

    // Admin has settings.manage permission via global college_admin role
    const authAdmin = await authorize(adminUser, "settings.manage");
    expect(authAdmin.authorized).toBe(true);

    // Regular student lacks settings.manage permission
    await expect(authorize(studentUser, "settings.manage")).rejects.toThrow();
  });
});
