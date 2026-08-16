import { prisma } from "@/server/database";

export interface UserPermissionResult {
  userId: string;
  roles: { id: string; name: string; code: string }[];
  permissions: string[];
  departmentIds: string[];
}

/**
 * Retrieves all assigned active permissions for a user across all their assigned roles.
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
      role: {
        isActive: true,
      },
    },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  const permissionCodes = new Set<string>();

  for (const ur of userRoles) {
    for (const rp of ur.role.rolePermissions) {
      if (rp.permission?.code) {
        permissionCodes.add(rp.permission.code);
      }
    }
  }

  return Array.from(permissionCodes);
}

/**
 * Checks whether a user possesses a specific permission code.
 */
export async function hasPermission(
  userId: string,
  permissionCode: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permissionCode);
}

/**
 * Retrieves assigned active roles for a user.
 */
export async function getUserRoles(userId: string) {
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
      role: {
        isActive: true,
      },
    },
    include: {
      role: true,
    },
  });

  return userRoles.map((ur) => ur.role);
}

/**
 * Retrieves department scopes assigned to a user.
 */
export async function getUserDepartmentScopes(userId: string) {
  const scopes = await prisma.userDepartmentScope.findMany({
    where: {
      userId,
      department: {
        isActive: true,
      },
    },
    include: {
      department: true,
    },
  });

  return scopes.map((s) => s.department);
}
