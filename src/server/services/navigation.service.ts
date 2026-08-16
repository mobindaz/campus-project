import { NAVIGATION_CONFIG, NavItem } from "@/config/navigation";
import { can, AuthUser } from "@/server/authorization";
import { getUserRoles, getUserDepartmentScopes } from "@/server/services/rbac.service";

export interface AuthorizedNavigation {
  items: NavItem[];
  userRoles: { id: string; name: string; code: string }[];
  primaryRoleCode?: string;
  departmentScopes: { id: string; name: string; code: string }[];
}

/**
 * Service function that evaluates navigation items against the logged-in user's actual permissions
 * via central authorize/can() helpers.
 */
export async function getAuthorizedNavigation(
  user: AuthUser
): Promise<AuthorizedNavigation> {
  const [userRoles, departmentScopes] = await Promise.all([
    getUserRoles(user.id),
    getUserDepartmentScopes(user.id),
  ]);

  const authorizedItems: NavItem[] = [];

  for (const item of NAVIGATION_CONFIG) {
    if (!item.requiredPermission) {
      authorizedItems.push(item);
    } else {
      const isAllowed = await can(user, item.requiredPermission);
      if (isAllowed) {
        authorizedItems.push(item);
      }
    }
  }

  const primaryRoleCode = userRoles[0]?.code;

  return {
    items: authorizedItems,
    userRoles,
    primaryRoleCode,
    departmentScopes,
  };
}
