import { UnauthorizedError, ForbiddenError } from "@/server/errors/app-error";
import {
  getUserPermissions,
  getUserRoles,
  getUserDepartmentScopes,
} from "@/server/services/rbac.service";

export interface AuthorizationContext {
  departmentId?: string;
  ownerId?: string;
  [key: string]: unknown;
}

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

export interface AuthorizationResult {
  authorized: boolean;
  userId: string;
  permission: string;
  context?: AuthorizationContext;
  roles: string[];
  permissions: string[];
  departmentIds: string[];
}

/** Global roles that have college-wide access across all department scopes */
const GLOBAL_SCOPE_ROLE_CODES = new Set(["college_admin", "principal"]);

/**
 * Central authorization function enforced across all server actions, services, and route handlers.
 * Checks both permission possession and department/owner scope rules.
 *
 * @throws {UnauthorizedError} if user is missing or invalid.
 * @throws {ForbiddenError} if user lacks permission or department scope is invalid.
 */
export async function authorize(
  user: AuthUser | null | undefined,
  permission: string,
  context?: AuthorizationContext
): Promise<AuthorizationResult> {
  if (!user || !user.id) {
    throw new UnauthorizedError(
      "Authentication required to perform this action."
    );
  }

  const [userRoles, userPermissions, userDepartmentScopes] = await Promise.all([
    getUserRoles(user.id),
    getUserPermissions(user.id),
    getUserDepartmentScopes(user.id),
  ]);

  const roleCodes = userRoles.map((r) => r.code);
  const isGlobalAdmin = roleCodes.some((code) =>
    GLOBAL_SCOPE_ROLE_CODES.has(code)
  );
  const departmentIds = userDepartmentScopes.map((d) => d.id);

  // 1. Permission check
  const hasPermissionCode =
    isGlobalAdmin || userPermissions.includes(permission);
  if (!hasPermissionCode) {
    throw new ForbiddenError(
      `Permission denied: Account lacks required permission '${permission}'.`
    );
  }

  // 2. Department Scope check (if context.departmentId is specified)
  if (context?.departmentId && !isGlobalAdmin) {
    const isDepartmentAllowed = departmentIds.includes(context.departmentId);
    if (!isDepartmentAllowed) {
      throw new ForbiddenError(
        `Permission denied: User department scope does not include department '${context.departmentId}'.`
      );
    }
  }

  // 3. Record Ownership check (if context.ownerId is specified)
  if (context?.ownerId && !isGlobalAdmin) {
    if (context.ownerId !== user.id) {
      throw new ForbiddenError(
        `Permission denied: User does not own record '${context.ownerId}'.`
      );
    }
  }

  return {
    authorized: true,
    userId: user.id,
    permission,
    context,
    roles: roleCodes,
    permissions: userPermissions,
    departmentIds,
  };
}

/**
 * Non-throwing predicate helper returning true if user is authorized, false otherwise.
 */
export async function can(
  user: AuthUser | null | undefined,
  permission: string,
  context?: AuthorizationContext
): Promise<boolean> {
  try {
    await authorize(user, permission, context);
    return true;
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return false;
    }
    throw error;
  }
}
