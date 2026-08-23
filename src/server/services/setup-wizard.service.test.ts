import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generatePeriodListPreview,
  executeSetupWizardTransactionService,
} from "./academic-period.service";
import * as rbacService from "@/server/services/rbac.service";
import { prisma } from "@/server/database";

vi.mock("@/server/services/rbac.service", () => ({
  getUserRoles: vi.fn(),
  getUserPermissions: vi.fn(),
  getUserDepartmentScopes: vi.fn(),
}));

vi.mock("@/server/services/audit.service", () => ({
  logAudit: vi.fn().mockResolvedValue(true),
}));

describe("Setup Wizard & Academic Period Generator Engine", () => {
  const adminUser = {
    id: "user_admin",
    name: "Admin User",
    email: "admin@college.edu",
  };

  const mockAdminRole = {
    id: "role_admin",
    name: "College Admin",
    code: "college_admin",
    description: "Admin",
    isSystem: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockAdminRole]);
    vi.mocked(rbacService.getUserPermissions).mockResolvedValue([]);
    vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([]);
  });

  // TEST CASE 1: Test 3-year Semester configuration
  it("TEST 1: generates continuous 6 semesters for a 3-year Semester configuration", () => {
    const periods = generatePeriodListPreview(3, "SEMESTER");

    expect(periods).toHaveLength(6);
    expect(periods.map((p) => p.name)).toEqual([
      "Year 1 - Semester 1",
      "Year 1 - Semester 2",
      "Year 2 - Semester 3",
      "Year 2 - Semester 4",
      "Year 3 - Semester 5",
      "Year 3 - Semester 6",
    ]);
    expect(periods.map((p) => p.code)).toEqual([
      "SEM_1",
      "SEM_2",
      "SEM_3",
      "SEM_4",
      "SEM_5",
      "SEM_6",
    ]);
    expect(periods.map((p) => p.periodNumber)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(periods.map((p) => p.yearNumber)).toEqual([1, 1, 2, 2, 3, 3]);
    expect(periods.map((p) => p.orderIndex)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  // TEST CASE 2: Test 4-year Semester configuration
  it("TEST 2: generates continuous 8 semesters for a 4-year Semester configuration", () => {
    const periods = generatePeriodListPreview(4, "SEMESTER");

    expect(periods).toHaveLength(8);
    expect(periods[0]).toEqual({
      yearNumber: 1,
      periodNumber: 1,
      name: "Year 1 - Semester 1",
      code: "SEM_1",
      pattern: "SEMESTER",
      orderIndex: 1,
    });
    expect(periods[7]).toEqual({
      yearNumber: 4,
      periodNumber: 8,
      name: "Year 4 - Semester 8",
      code: "SEM_8",
      pattern: "SEMESTER",
      orderIndex: 8,
    });
  });

  // TEST CASE 3: Test 3-year Year configuration
  it("TEST 3: generates 3 year periods for a 3-year Year configuration", () => {
    const periods = generatePeriodListPreview(3, "YEAR");

    expect(periods).toHaveLength(3);
    expect(periods.map((p) => p.name)).toEqual(["Year 1", "Year 2", "Year 3"]);
    expect(periods.map((p) => p.code)).toEqual(["YR_1", "YR_2", "YR_3"]);
    expect(periods.map((p) => p.periodNumber)).toEqual([1, 2, 3]);
    expect(periods.map((p) => p.yearNumber)).toEqual([1, 2, 3]);
  });

  // TEST CASE 4: Test Program without Department
  it("TEST 4: executes setup wizard for a standalone program without departments", async () => {
    const mockProgram = {
      id: "prog_bca",
      name: "Bachelor of Computer Applications",
      code: "BCA",
      shortName: "BCA",
      type: "DEGREE",
      durationYears: 3,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Spy transaction
    const txMock = {
      program: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(mockProgram),
      },
      department: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      academicPeriod: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: `p_${data.code}`, ...data })
          ),
      },
      collegeProfile: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(prisma, "$transaction").mockImplementation((cb: any) =>
      cb(txMock)
    );

    const result = await executeSetupWizardTransactionService(adminUser, {
      program: {
        name: "Bachelor of Computer Applications",
        code: "BCA",
        shortName: "BCA",
        type: "DEGREE",
        durationYears: 3,
      },
      departments: [],
      periodPattern: "SEMESTER",
    });

    expect(result.program.code).toBe("BCA");
    expect(result.departments).toHaveLength(0);
    expect(result.periods).toHaveLength(6);
    expect(txMock.collegeProfile.updateMany).toHaveBeenCalledWith({
      data: { isConfigured: true },
    });
  });

  // TEST CASE 5: Test Program with multiple Departments
  it("TEST 5: executes setup wizard for a program with multiple departments", async () => {
    const mockProgram = {
      id: "prog_btech",
      name: "Bachelor of Technology",
      code: "BTECH",
      shortName: "B.Tech",
      type: "DEGREE",
      durationYears: 4,
      isActive: true,
    };

    const mockDept1 = {
      id: "dept_cse",
      name: "Computer Science & Engineering",
      code: "CSE",
      programId: "prog_btech",
    };
    const mockDept2 = {
      id: "dept_mech",
      name: "Mechanical Engineering",
      code: "MECH",
      programId: "prog_btech",
    };

    const txMock = {
      program: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(mockProgram),
      },
      department: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi
          .fn()
          .mockResolvedValueOnce(mockDept1)
          .mockResolvedValueOnce(mockDept2),
      },
      academicPeriod: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: `p_${data.code}`, ...data })
          ),
      },
      collegeProfile: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(prisma, "$transaction").mockImplementation((cb: any) =>
      cb(txMock)
    );

    const result = await executeSetupWizardTransactionService(adminUser, {
      program: {
        name: "Bachelor of Technology",
        code: "BTECH",
        shortName: "B.Tech",
        type: "DEGREE",
        durationYears: 4,
      },
      departments: [
        { name: "Computer Science & Engineering", code: "CSE" },
        { name: "Mechanical Engineering", code: "MECH" },
      ],
      periodPattern: "SEMESTER",
    });

    expect(result.program.code).toBe("BTECH");
    expect(result.departments).toHaveLength(2);
    expect(result.periods).toHaveLength(8);
  });

  // TEST CASE 6: Test running the wizard after existing data already exists
  it("TEST 6: re-running setup wizard updates existing program/dept and prevents duplicate period creation", async () => {
    const existingProgram = {
      id: "prog_btech",
      name: "Bachelor of Technology",
      code: "BTECH",
      shortName: "B.Tech",
      type: "DEGREE",
      durationYears: 4,
      isActive: true,
    };

    const existingDept = {
      id: "dept_cse",
      name: "Computer Science & Engineering",
      code: "CSE",
      programId: "prog_btech",
    };

    const existingPeriod = {
      id: "p_SEM_1",
      name: "Year 1 - Semester 1",
      code: "SEM_1",
      pattern: "SEMESTER",
      orderIndex: 1,
      programId: "prog_btech",
      isActive: true,
    };

    const txMock = {
      program: {
        findFirst: vi.fn().mockResolvedValue(existingProgram),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue(existingProgram),
      },
      department: {
        findFirst: vi.fn().mockResolvedValue(existingDept),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue(existingDept),
      },
      academicPeriod: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.programId_code.code === "SEM_1") {
            return Promise.resolve(existingPeriod);
          }
          return Promise.resolve(null);
        }),
        create: vi
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: `p_${data.code}`, ...data })
          ),
      },
      collegeProfile: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(prisma, "$transaction").mockImplementation((cb: any) =>
      cb(txMock)
    );

    const result = await executeSetupWizardTransactionService(adminUser, {
      program: {
        name: "Bachelor of Technology",
        code: "BTECH",
        shortName: "B.Tech",
        type: "DEGREE",
        durationYears: 4,
      },
      departments: [{ name: "Computer Science & Engineering", code: "CSE" }],
      periodPattern: "SEMESTER",
    });

    expect(txMock.program.create).not.toHaveBeenCalled();
    expect(txMock.program.update).toHaveBeenCalled();
    expect(txMock.department.update).toHaveBeenCalled();
    // 8 total periods: SEM_1 already existed so 7 were newly created
    expect(txMock.academicPeriod.create).toHaveBeenCalledTimes(7);
    expect(result.periods).toHaveLength(8);
  });

  // TEST CASE 7: Test direct login without completing Setup Wizard
  it("TEST 7: confirms unauthenticated access to setup wizard or root redirects to login, enabling direct login flow", async () => {
    const { middleware } = await import("@/middleware");

    // Unauthenticated request to /setup-wizard
    const reqSetup = {
      nextUrl: new URL("http://localhost:3000/setup-wizard"),
      cookies: { get: vi.fn().mockReturnValue(undefined) },
      url: "http://localhost:3000/setup-wizard",
    };

    const resSetup = middleware(
      reqSetup as unknown as import("next/server").NextRequest
    );
    expect(resSetup?.headers.get("location")).toContain("/login");

    // Authenticated user directly accessing login page redirects to dashboard
    const reqLoginAuth = {
      nextUrl: new URL("http://localhost:3000/login"),
      cookies: { get: vi.fn().mockReturnValue({ value: "valid_session" }) },
      url: "http://localhost:3000/login",
    };

    const resLoginAuth = middleware(
      reqLoginAuth as unknown as import("next/server").NextRequest
    );
    expect(resLoginAuth?.headers.get("location")).toContain("/dashboard");
  }, 15000);
});
