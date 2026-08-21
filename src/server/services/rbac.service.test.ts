import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/database", () => ({
  prisma: {
    userRole: {
      findMany: vi.fn(),
    },
    userDepartmentScope: {
      findMany: vi.fn(),
    },
  },
}));

import {
  getUserPermissions,
  hasPermission,
  getUserRoles,
  getUserDepartmentScopes,
} from "./rbac.service";
import { prisma } from "@/server/database";

describe("rbac.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserPermissions", () => {
    it("aggregates permission codes from all assigned active roles", async () => {
      const mockUserRoles = [
        {
          role: {
            id: "role_1",
            code: "college_admin",
            isActive: true,
            rolePermissions: [
              { permission: { code: "students.read" } },
              { permission: { code: "students.create" } },
            ],
          },
        },
        {
          role: {
            id: "role_2",
            code: "placement_officer",
            isActive: true,
            rolePermissions: [
              { permission: { code: "placement.read" } },
              { permission: { code: "students.read" } }, // duplicate to test deduplication
            ],
          },
        },
      ];

      vi.mocked(prisma.userRole.findMany).mockResolvedValue(
        mockUserRoles as unknown as Awaited<
          ReturnType<typeof prisma.userRole.findMany>
        >
      );

      const perms = await getUserPermissions("user_123");
      expect(perms).toEqual([
        "students.read",
        "students.create",
        "placement.read",
      ]);
    });

    it("returns empty array when user has no roles assigned", async () => {
      vi.mocked(prisma.userRole.findMany).mockResolvedValue([]);

      const perms = await getUserPermissions("user_none");
      expect(perms).toEqual([]);
    });
  });

  describe("hasPermission", () => {
    it("returns true if user has the specified permission", async () => {
      vi.mocked(prisma.userRole.findMany).mockResolvedValue([
        {
          role: {
            rolePermissions: [{ permission: { code: "tc.approve" } }],
          },
        },
      ] as unknown as Awaited<ReturnType<typeof prisma.userRole.findMany>>);

      const result = await hasPermission("user_123", "tc.approve");
      expect(result).toBe(true);
    });

    it("returns false if user does not have the specified permission", async () => {
      vi.mocked(prisma.userRole.findMany).mockResolvedValue([
        {
          role: {
            rolePermissions: [{ permission: { code: "students.read" } }],
          },
        },
      ] as unknown as Awaited<ReturnType<typeof prisma.userRole.findMany>>);

      const result = await hasPermission("user_123", "settings.manage");
      expect(result).toBe(false);
    });
  });

  describe("getUserRoles & getUserDepartmentScopes", () => {
    it("returns user roles", async () => {
      const mockRole = { id: "role_1", name: "HOD", code: "hod" };
      vi.mocked(prisma.userRole.findMany).mockResolvedValue([
        { role: mockRole },
      ] as unknown as Awaited<ReturnType<typeof prisma.userRole.findMany>>);

      const roles = await getUserRoles("user_123");
      expect(roles).toEqual([mockRole]);
    });

    it("returns user department scopes", async () => {
      const mockDept = { id: "dept_1", name: "Computer Science", code: "CSE" };
      vi.mocked(prisma.userDepartmentScope.findMany).mockResolvedValue([
        { department: mockDept },
      ] as unknown as Awaited<
        ReturnType<typeof prisma.userDepartmentScope.findMany>
      >);

      const depts = await getUserDepartmentScopes("user_123");
      expect(depts).toEqual([mockDept]);
    });
  });
});
