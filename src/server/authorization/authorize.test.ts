import { describe, it, expect, vi, beforeEach } from "vitest";
import { authorize, can } from "./index";
import { UnauthorizedError, ForbiddenError } from "@/server/errors/app-error";

vi.mock("@/server/services/rbac.service", () => ({
  getUserRoles: vi.fn(),
  getUserPermissions: vi.fn(),
  getUserDepartmentScopes: vi.fn(),
}));

import {
  getUserRoles,
  getUserPermissions,
  getUserDepartmentScopes,
} from "@/server/services/rbac.service";

describe("Central Authorization Module (authorize & can)", () => {
  const mockUser = {
    id: "usr_hod_1",
    email: "hod.cse@college.edu",
    name: "HOD CSE",
  };
  const mockAdminUser = {
    id: "usr_admin_1",
    email: "admin@college.edu",
    name: "College Admin",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws UnauthorizedError when user is null or undefined", async () => {
    await expect(authorize(null, "students.read")).rejects.toThrow(
      UnauthorizedError
    );
    await expect(authorize(undefined, "students.read")).rejects.toThrow(
      "Authentication required"
    );
  });

  it("succeeds when user has the right permission and right department scope", async () => {
    vi.mocked(getUserRoles).mockResolvedValue([
      { id: "role_hod", code: "hod", name: "HOD" },
    ] as unknown as Awaited<ReturnType<typeof getUserRoles>>);
    vi.mocked(getUserPermissions).mockResolvedValue([
      "students.read",
      "students.update",
    ]);
    vi.mocked(getUserDepartmentScopes).mockResolvedValue([
      { id: "dept_cse", code: "CSE", name: "Computer Science" },
    ] as unknown as Awaited<ReturnType<typeof getUserDepartmentScopes>>);

    const result = await authorize(mockUser, "students.read", {
      departmentId: "dept_cse",
    });

    expect(result.authorized).toBe(true);
    expect(result.userId).toBe("usr_hod_1");
    expect(result.permission).toBe("students.read");
  });

  it("fails with ForbiddenError when user has right permission but wrong department scope", async () => {
    vi.mocked(getUserRoles).mockResolvedValue([
      { id: "role_hod", code: "hod", name: "HOD" },
    ] as unknown as Awaited<ReturnType<typeof getUserRoles>>);
    vi.mocked(getUserPermissions).mockResolvedValue(["students.read"]);
    vi.mocked(getUserDepartmentScopes).mockResolvedValue([
      { id: "dept_cse", code: "CSE", name: "Computer Science" },
    ] as unknown as Awaited<ReturnType<typeof getUserDepartmentScopes>>);

    await expect(
      authorize(mockUser, "students.read", { departmentId: "dept_mech" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("fails with ForbiddenError when user has wrong permission regardless of scope", async () => {
    vi.mocked(getUserRoles).mockResolvedValue([
      { id: "role_hod", code: "hod", name: "HOD" },
    ] as unknown as Awaited<ReturnType<typeof getUserRoles>>);
    vi.mocked(getUserPermissions).mockResolvedValue(["students.read"]);
    vi.mocked(getUserDepartmentScopes).mockResolvedValue([
      { id: "dept_cse", code: "CSE", name: "Computer Science" },
    ] as unknown as Awaited<ReturnType<typeof getUserDepartmentScopes>>);

    await expect(
      authorize(mockUser, "settings.manage", { departmentId: "dept_cse" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("succeeds for global roles (College Admin / Principal) for any department scope", async () => {
    vi.mocked(getUserRoles).mockResolvedValue([
      { id: "role_admin", code: "college_admin", name: "College Admin" },
    ] as unknown as Awaited<ReturnType<typeof getUserRoles>>);
    vi.mocked(getUserPermissions).mockResolvedValue([
      "settings.manage",
      "students.delete",
    ]);
    vi.mocked(getUserDepartmentScopes).mockResolvedValue([]);

    const result = await authorize(mockAdminUser, "students.delete", {
      departmentId: "dept_mech",
    });

    expect(result.authorized).toBe(true);
    expect(result.roles).toContain("college_admin");
  });

  it("can() helper returns boolean without throwing error", async () => {
    vi.mocked(getUserRoles).mockResolvedValue([
      { id: "role_hod", code: "hod", name: "HOD" },
    ] as unknown as Awaited<ReturnType<typeof getUserRoles>>);
    vi.mocked(getUserPermissions).mockResolvedValue(["tc.read"]);
    vi.mocked(getUserDepartmentScopes).mockResolvedValue([
      { id: "dept_cse", code: "CSE" },
    ] as unknown as Awaited<ReturnType<typeof getUserDepartmentScopes>>);

    const canRead = await can(mockUser, "tc.read", {
      departmentId: "dept_cse",
    });
    const canWrite = await can(mockUser, "settings.manage", {
      departmentId: "dept_cse",
    });
    const unauthCan = await can(null, "tc.read");

    expect(canRead).toBe(true);
    expect(canWrite).toBe(false);
    expect(unauthCan).toBe(false);
  });
});
