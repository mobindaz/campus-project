/**
 * REFERENCE SERVICE PATTERN
 * =========================
 * All domain service modules in this platform MUST follow this standard architecture pattern:
 *
 * 1. Server-Side Authorization: Every mutating and query operation MUST invoke `authorize(user, permission, context)`
 *    at the top of the service function. Never trust client-side or middleware authorization checks alone.
 * 2. Zod Input Validation: Validate all raw input parameters using strict Zod schemas before executing business logic.
 * 3. Business Invariants: Check domain rules (e.g., uniqueness of codes/names, reference counts for deletion vs deactivation).
 * 4. Repository Layer Delegation: Perform all database interactions strictly via repository functions.
 *    Never call Prisma Client directly from services, route handlers, or server actions.
 * 5. Platform Engine Integration: Trigger relevant platform engines (e.g. `logAudit()` for mutation audit trails).
 * 6. Structured Error Propagation: Throw typed `AppError` subclasses (`ForbiddenError`, `ValidationError`, `NotFoundError`).
 */

import { authorize, AuthUser } from "@/server/authorization";
import { NotFoundError, ValidationError } from "@/server/errors/app-error";
import {
  countDepartmentReferences,
  createDepartment,
  deactivateDepartment,
  deleteDepartment,
  findDepartmentByCode,
  findDepartmentById,
  findDepartmentByName,
  listDepartments,
  updateDepartment,
} from "@/server/repositories/department.repository";
import { logAudit } from "@/server/services/audit.service";
import {
  createDepartmentSchema,
  CreateDepartmentInput,
  departmentFilterSchema,
  DepartmentFilterInput,
  updateDepartmentSchema,
  UpdateDepartmentInput,
} from "@/modules/departments/schemas";

/**
 * Lists all departments matching given filter criteria after authorizing user.
 */
export async function listDepartmentsService(
  user: AuthUser | null | undefined,
  filters?: DepartmentFilterInput
) {
  await authorize(user, "departments.read");

  const validatedFilters = departmentFilterSchema.parse(filters || {});
  return listDepartments(validatedFilters);
}

/**
 * Gets a single department by its ID after authorizing user.
 */
export async function getDepartmentByIdService(
  user: AuthUser | null | undefined,
  id: string
) {
  await authorize(user, "departments.read");

  if (!id || typeof id !== "string") {
    throw new ValidationError("Department ID is required.");
  }

  const department = await findDepartmentById(id);
  if (!department) {
    throw new NotFoundError(`Department with ID '${id}' not found.`);
  }

  return department;
}

/**
 * Creates a new department after validating permissions, inputs, and uniqueness constraints.
 */
export async function createDepartmentService(
  user: AuthUser | null | undefined,
  input: CreateDepartmentInput
) {
  const authResult = await authorize(user, "departments.create");
  const parsed = createDepartmentSchema.parse(input);

  const validatedData = {
    ...parsed,
    name: parsed.name.trim(),
    code: parsed.code.trim().toUpperCase(),
    description: parsed.description?.trim() || undefined,
  };

  // Check unique constraints
  const existingCode = await findDepartmentByCode(validatedData.code);
  if (existingCode) {
    throw new ValidationError(`Department with code '${validatedData.code}' already exists.`);
  }

  const existingName = await findDepartmentByName(validatedData.name);
  if (existingName) {
    throw new ValidationError(`Department with name '${validatedData.name}' already exists.`);
  }

  const newDepartment = await createDepartment(validatedData);

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "DEPARTMENT_CREATE",
    entity: "Department",
    entityId: newDepartment.id,
    details: {
      name: newDepartment.name,
      code: newDepartment.code,
      type: newDepartment.type,
      isActive: newDepartment.isActive,
    },
  });

  return newDepartment;
}

/**
 * Updates an existing department after validating permissions, input fields, and uniqueness rules.
 */
export async function updateDepartmentService(
  user: AuthUser | null | undefined,
  id: string,
  input: UpdateDepartmentInput
) {
  const authResult = await authorize(user, "departments.update");

  if (!id || typeof id !== "string") {
    throw new ValidationError("Department ID is required.");
  }

  const existingDepartment = await findDepartmentById(id);
  if (!existingDepartment) {
    throw new NotFoundError(`Department with ID '${id}' not found.`);
  }

  const parsed = updateDepartmentSchema.parse(input);
  const validatedData: Partial<CreateDepartmentInput> = { ...parsed };
  if (parsed.name) validatedData.name = parsed.name.trim();
  if (parsed.code) validatedData.code = parsed.code.trim().toUpperCase();
  if (parsed.description !== undefined) {
    validatedData.description = parsed.description.trim() || undefined;
  }

  if (validatedData.code && validatedData.code !== existingDepartment.code) {
    const codeConflict = await findDepartmentByCode(validatedData.code);
    if (codeConflict) {
      throw new ValidationError(`Department code '${validatedData.code}' is already taken.`);
    }
  }

  if (validatedData.name && validatedData.name !== existingDepartment.name) {
    const nameConflict = await findDepartmentByName(validatedData.name);
    if (nameConflict) {
      throw new ValidationError(`Department name '${validatedData.name}' is already taken.`);
    }
  }

  const updatedDepartment = await updateDepartment(id, validatedData);

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "DEPARTMENT_UPDATE",
    entity: "Department",
    entityId: updatedDepartment.id,
    details: {
      before: {
        name: existingDepartment.name,
        code: existingDepartment.code,
        type: existingDepartment.type,
        isActive: existingDepartment.isActive,
      },
      after: {
        name: updatedDepartment.name,
        code: updatedDepartment.code,
        type: updatedDepartment.type,
        isActive: updatedDepartment.isActive,
      },
    },
  });

  return updatedDepartment;
}

/**
 * Deactivates a department (soft delete).
 */
export async function deactivateDepartmentService(
  user: AuthUser | null | undefined,
  id: string
) {
  const authResult = await authorize(user, "departments.update");

  if (!id || typeof id !== "string") {
    throw new ValidationError("Department ID is required.");
  }

  const existingDepartment = await findDepartmentById(id);
  if (!existingDepartment) {
    throw new NotFoundError(`Department with ID '${id}' not found.`);
  }

  const deactivated = await deactivateDepartment(id);

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "DEPARTMENT_DEACTIVATE",
    entity: "Department",
    entityId: id,
    details: {
      name: deactivated.name,
      code: deactivated.code,
    },
  });

  return deactivated;
}

/**
 * Deletes or deactivates a department depending on whether foreign key references exist (Correction #8).
 * - 0 references -> Hard delete
 * - >0 references -> Soft deactivate
 */
export async function deleteDepartmentService(
  user: AuthUser | null | undefined,
  id: string
) {
  const authResult = await authorize(user, "departments.delete");

  if (!id || typeof id !== "string") {
    throw new ValidationError("Department ID is required.");
  }

  const existingDepartment = await findDepartmentById(id);
  if (!existingDepartment) {
    throw new NotFoundError(`Department with ID '${id}' not found.`);
  }

  const refCount = await countDepartmentReferences(id);

  if (refCount > 0) {
    const deactivated = await deactivateDepartment(id);

    await logAudit({
      userId: authResult.userId,
      userEmail: user?.email,
      action: "DEPARTMENT_FORCE_DEACTIVATE_DUE_TO_REFERENCES",
      entity: "Department",
      entityId: id,
      details: {
        name: existingDepartment.name,
        referenceCount: refCount,
      },
    });

    return {
      department: deactivated,
      mode: "DEACTIVATED" as const,
      message: `Department has ${refCount} active scope/data reference(s). It was deactivated instead of deleted to preserve record integrity.`,
    };
  }

  await deleteDepartment(id);

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "DEPARTMENT_DELETE",
    entity: "Department",
    entityId: id,
    details: {
      name: existingDepartment.name,
      code: existingDepartment.code,
    },
  });

  return {
    department: existingDepartment,
    mode: "DELETED" as const,
    message: "Department permanently deleted.",
  };
}
