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
  listDepartmentsPaginated,
  updateDepartment,
} from "@/server/repositories/department.repository";
import {
  buildPaginatedQuery,
  buildCsvExport,
} from "@/server/services/data-table.service";
import type {
  DataTableConfig,
  DataTableColumnDef,
} from "@/components/tables/data-table.types";
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
    throw new ValidationError(
      `Department with code '${validatedData.code}' already exists.`
    );
  }

  const existingName = await findDepartmentByName(validatedData.name);
  if (existingName) {
    throw new ValidationError(
      `Department with name '${validatedData.name}' already exists.`
    );
  }

  // Verify parent program exists if programId is provided
  if (parsed.programId) {
    const { findProgramById } =
      await import("@/server/repositories/program.repository");
    const program = await findProgramById(parsed.programId);
    if (!program) {
      throw new ValidationError(
        `Associated program with ID '${parsed.programId}' does not exist.`
      );
    }
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
      programId: newDepartment.programId,
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
      throw new ValidationError(
        `Department code '${validatedData.code}' is already taken.`
      );
    }
  }

  if (validatedData.name && validatedData.name !== existingDepartment.name) {
    const nameConflict = await findDepartmentByName(validatedData.name);
    if (nameConflict) {
      throw new ValidationError(
        `Department name '${validatedData.name}' is already taken.`
      );
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

// ─── Dynamic Tables Engine: Paginated List ───────────────────────────────────

/**
 * Lists departments with server-side pagination, sorting, searching, and filtering.
 * Used by the DataTable component.
 */
export async function listDepartmentsPaginatedService(
  user: AuthUser | null | undefined,
  config: DataTableConfig
) {
  await authorize(user, "departments.read");

  const { skip, take, orderBy, searchTerm } = buildPaginatedQuery(config);

  const { data, total } = await listDepartmentsPaginated({
    skip,
    take,
    orderBy,
    searchTerm,
    filters: config.filters,
  });

  const pageSize = take;
  const totalPages = Math.ceil(total / pageSize);

  return {
    data,
    total,
    page: config.page,
    pageSize,
    totalPages,
  };
}

// ─── Dynamic Tables Engine: CSV Export ───────────────────────────────────────

interface DepartmentRow {
  id: string;
  name: string;
  code: string;
  type: string;
  description?: string | null;
  isActive: boolean;
  program?: { name: string; code: string } | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/** Column definitions used for CSV export value extraction */
const DEPARTMENT_EXPORT_COLUMNS: DataTableColumnDef<DepartmentRow>[] = [
  { id: "name", header: "Name", accessorKey: "name" },
  { id: "code", header: "Code", accessorKey: "code" },
  { id: "type", header: "Type", accessorKey: "type" },
  {
    id: "program",
    header: "Parent Program",
    exportAccessor: (row) => row.program?.name ?? "",
  },
  { id: "description", header: "Description", accessorKey: "description" },
  {
    id: "status",
    header: "Status",
    accessorKey: "isActive",
    exportAccessor: (row) => (row.isActive ? "Active" : "Inactive"),
  },
];

/**
 * Exports departments matching current filters as a CSV string.
 * Requires `departments.export` permission — returns 403 if missing.
 */
export async function exportDepartmentsCsvService(
  user: AuthUser | null | undefined,
  config: DataTableConfig,
  userPermissions: string[]
) {
  await authorize(user, "departments.export");

  // Fetch all matching rows (no pagination limit for export)
  const { searchTerm } = buildPaginatedQuery(config);
  const { data } = await listDepartmentsPaginated({
    skip: 0,
    take: 10000, // reasonable cap for CSV export
    searchTerm,
    filters: config.filters,
  });

  return buildCsvExport(
    data as unknown as DepartmentRow[],
    DEPARTMENT_EXPORT_COLUMNS,
    config.visibleColumns,
    userPermissions
  );
}
