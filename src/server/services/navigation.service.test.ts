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
  const mockUser = {
    id: "usr_101",
    name: "Test User",
    email: "test@college.edu",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only un-permissioned Dashboard item for user with zero permissions", async () => {
    vi.mocked(rbacService.getUserRoles).mockResolvedValue([
      { id: "role_student", code: "student", name: "Student" },
    ] as unknown as Awaited<ReturnType<typeof rbacService.getUserRoles>>);
    vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([]);
    vi.mocked(authModule.can).mockResolvedValue(false);

    const nav = await getAuthorizedNavigation(mockUser);

    expect(nav.items.length).toBe(1);
    expect(nav.items[0].title).toBe("Dashboard");
    expect(nav.primaryRoleCode).toBe("student");
  });

  it("returns full navigation list for College Admin user", async () => {
    vi.mocked(rbacService.getUserRoles).mockResolvedValue([
      { id: "role_admin", code: "college_admin", name: "College Admin" },
    ] as unknown as Awaited<ReturnType<typeof rbacService.getUserRoles>>);
    vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([]);
    vi.mocked(authModule.can).mockResolvedValue(true);

    const nav = await getAuthorizedNavigation(mockUser);

    expect(nav.items.length).toBeGreaterThan(5);
    expect(nav.items.some((i) => i.title === "Students")).toBe(true);
    expect(nav.items.some((i) => i.title === "Platform Settings")).toBe(true);
    expect(nav.primaryRoleCode).toBe("college_admin");
  });

  it("returns filtered navigation list for user with selective permissions", async () => {
    vi.mocked(rbacService.getUserRoles).mockResolvedValue([
      { id: "role_hod", code: "hod", name: "HOD" },
    ] as unknown as Awaited<ReturnType<typeof rbacService.getUserRoles>>);
    vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([
      { id: "dept_cse", code: "CSE", name: "Computer Science" },
    ] as unknown as Awaited<
      ReturnType<typeof rbacService.getUserDepartmentScopes>
    >);

    vi.mocked(authModule.can).mockImplementation(
      async (_user: unknown, permission: string) => {
        return permission === "students.read" || permission === "tc.read";
      }
    );

    const nav = await getAuthorizedNavigation(mockUser);

    const titles = nav.items.map((i) => i.title);
    expect(titles).toContain("Dashboard");
    expect(titles).toContain("Students");
    expect(titles).toContain("TC Management");
    expect(titles).not.toContain("Platform Settings");
    expect(nav.departmentScopes).toHaveLength(1);
  });
});
