import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAuthorizedNavigation } from "./navigation.service";
import * as authModule from "@/server/authorization";
import * as rbacService from "@/server/services/rbac.service";

vi.mock("@/server/authorization", async (importOriginal) => {
  const actual = await importOriginal<typeof authModule>();
  return {
    ...actual,
    can: vi.fn(),
  };
});

vi.mock("@/server/services/rbac.service", () => ({
  getUserRoles: vi.fn(),
  getUserDepartmentScopes: vi.fn(),
}));

describe("Navigation Service (getAuthorizedNavigation)", () => {
  const mockUser = { id: "usr_101", name: "Test User", email: "test@college.edu" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only un-permissioned Dashboard item for user with zero permissions", async () => {
    (rbacService.getUserRoles as any).mockResolvedValue([
      { id: "role_student", code: "student", name: "Student" },
    ]);
    (rbacService.getUserDepartmentScopes as any).mockResolvedValue([]);
    (authModule.can as any).mockResolvedValue(false);

    const nav = await getAuthorizedNavigation(mockUser);

    expect(nav.items.length).toBe(1);
    expect(nav.items[0].title).toBe("Dashboard");
    expect(nav.primaryRoleCode).toBe("student");
  });

  it("returns full navigation list for College Admin user", async () => {
    (rbacService.getUserRoles as any).mockResolvedValue([
      { id: "role_admin", code: "college_admin", name: "College Admin" },
    ]);
    (rbacService.getUserDepartmentScopes as any).mockResolvedValue([]);
    (authModule.can as any).mockResolvedValue(true);

    const nav = await getAuthorizedNavigation(mockUser);

    expect(nav.items.length).toBeGreaterThan(5);
    expect(nav.items.some((i) => i.title === "Students")).toBe(true);
    expect(nav.items.some((i) => i.title === "Platform Settings")).toBe(true);
    expect(nav.primaryRoleCode).toBe("college_admin");
  });

  it("returns filtered navigation list for user with selective permissions", async () => {
    (rbacService.getUserRoles as any).mockResolvedValue([
      { id: "role_hod", code: "hod", name: "HOD" },
    ]);
    (rbacService.getUserDepartmentScopes as any).mockResolvedValue([
      { id: "dept_cse", code: "CSE", name: "Computer Science" },
    ]);

    (authModule.can as any).mockImplementation(async (_user: any, permission: string) => {
      return permission === "students.read" || permission === "tc.read";
    });

    const nav = await getAuthorizedNavigation(mockUser);

    const titles = nav.items.map((i) => i.title);
    expect(titles).toContain("Dashboard");
    expect(titles).toContain("Students");
    expect(titles).toContain("TC Management");
    expect(titles).not.toContain("Platform Settings");
    expect(nav.departmentScopes).toHaveLength(1);
  });
});
