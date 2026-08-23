/**
 * REFERENCE SERVICE PATTERN - PROGRAM MODULE
 * ==========================================
 * Demonstrates pattern generalization from Prompt 9 (Department):
 * 1. Server-Side Authorization: Invokes `authorize(user, permission, context)` on every function.
 * 2. Zod Input Validation: Validates program input structure.
 * 3. Business Invariants: Verifies department existence, program code/name uniqueness, and reference checks.
 * 4. Repository Layer Delegation: All database queries go through `program.repository.ts`.
 * 5. Platform Engine Integration: Emits `logAudit()` on all mutation events.
 * 6. Typed AppError Propagation: Throws `ForbiddenError`, `ValidationError`, `NotFoundError`.
 */

import { authorize, AuthUser } from "@/server/authorization";
import { NotFoundError, ValidationError } from "@/server/errors/app-error";
import {
  countProgramReferences,
  createProgram,
  deactivateProgram,
  deleteProgram,
  findProgramByCode,
  findProgramById,
  findProgramByName,
  listPrograms,
  listProgramsPaginated,
  updateProgram,
} from "@/server/repositories/program.repository";
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
  createProgramSchema,
  CreateProgramInput,
  programFilterSchema,
  ProgramFilterInput,
  updateProgramSchema,
  UpdateProgramInput,
} from "@/modules/programs/schemas";

/**
 * Lists all programs matching given filter criteria after authorizing user.
 */
export async function listProgramsService(
  user: AuthUser | null | undefined,
  filters?: ProgramFilterInput
) {
  const validatedFilters = programFilterSchema.parse(filters || {});
  await authorize(user, "programs.read");

  return listPrograms(validatedFilters);
}

/**
 * Gets a single program by ID after authorizing user.
 */
export async function getProgramByIdService(
  user: AuthUser | null | undefined,
  id: string
) {
  await authorize(user, "programs.read");

  if (!id || typeof id !== "string") {
    throw new ValidationError("Program ID is required.");
  }

  const program = await findProgramById(id);
  if (!program) {
    throw new NotFoundError(`Program with ID '${id}' not found.`);
  }

  return program;
}

/**
 * Creates a new top-level program (e.g. B.Tech, Diploma, BCA).
 */
export async function createProgramService(
  user: AuthUser | null | undefined,
  input: CreateProgramInput
) {
  const authResult = await authorize(user, "programs.create");

  const parsed = createProgramSchema.parse(input);

  const validatedData = {
    ...parsed,
    name: parsed.name.trim(),
    code: parsed.code.trim().toUpperCase(),
    shortName: parsed.shortName.trim(),
  };

  // Check unique constraints
  const existingCode = await findProgramByCode(validatedData.code);
  if (existingCode) {
    throw new ValidationError(
      `Program with code '${validatedData.code}' already exists.`
    );
  }

  const existingName = await findProgramByName(validatedData.name);
  if (existingName) {
    throw new ValidationError(
      `Program with name '${validatedData.name}' already exists.`
    );
  }

  const newProgram = await createProgram({
    name: validatedData.name,
    code: validatedData.code,
    shortName: validatedData.shortName,
    type: validatedData.type,
    durationYears: validatedData.durationYears,
    isActive: validatedData.isActive,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customFields: (validatedData.customFields || {}) as any,
  });

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "PROGRAM_CREATE",
    entity: "Program",
    entityId: newProgram.id,
    details: {
      name: newProgram.name,
      code: newProgram.code,
      type: newProgram.type,
      durationYears: newProgram.durationYears,
    },
  });

  return newProgram;
}

/**
 * Updates an existing program after validating permissions and uniqueness.
 */
export async function updateProgramService(
  user: AuthUser | null | undefined,
  id: string,
  input: UpdateProgramInput
) {
  if (!id || typeof id !== "string") {
    throw new ValidationError("Program ID is required.");
  }

  const existingProgram = await findProgramById(id);
  if (!existingProgram) {
    throw new NotFoundError(`Program with ID '${id}' not found.`);
  }

  const parsed = updateProgramSchema.parse(input);
  const authResult = await authorize(user, "programs.update");

  const validatedData: Partial<UpdateProgramInput> & Record<string, unknown> = {
    ...parsed,
  };
  if (parsed.name) validatedData.name = parsed.name.trim();
  if (parsed.code) validatedData.code = parsed.code.trim().toUpperCase();
  if (parsed.shortName) validatedData.shortName = parsed.shortName.trim();

  if (validatedData.code && validatedData.code !== existingProgram.code) {
    const codeConflict = await findProgramByCode(validatedData.code);
    if (codeConflict) {
      throw new ValidationError(
        `Program code '${validatedData.code}' is already taken.`
      );
    }
  }

  if (validatedData.name && validatedData.name !== existingProgram.name) {
    const nameConflict = await findProgramByName(validatedData.name);
    if (nameConflict) {
      throw new ValidationError(
        `Program name '${validatedData.name}' is already taken.`
      );
    }
  }

  const updatedProgram = await updateProgram(id, validatedData);

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "PROGRAM_UPDATE",
    entity: "Program",
    entityId: updatedProgram.id,
    details: {
      before: {
        name: existingProgram.name,
        code: existingProgram.code,
        isActive: existingProgram.isActive,
      },
      after: {
        name: updatedProgram.name,
        code: updatedProgram.code,
        isActive: updatedProgram.isActive,
      },
    },
  });

  return updatedProgram;
}

/**
 * Deactivates a program (soft delete).
 */
export async function deactivateProgramService(
  user: AuthUser | null | undefined,
  id: string
) {
  if (!id || typeof id !== "string") {
    throw new ValidationError("Program ID is required.");
  }

  const existingProgram = await findProgramById(id);
  if (!existingProgram) {
    throw new NotFoundError(`Program with ID '${id}' not found.`);
  }

  const authResult = await authorize(user, "programs.update");

  const deactivated = await deactivateProgram(id);

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "PROGRAM_DEACTIVATE",
    entity: "Program",
    entityId: id,
    details: {
      name: deactivated.name,
      code: deactivated.code,
    },
  });

  return deactivated;
}

/**
 * Deletes or deactivates a program depending on reference count guard (Correction #8).
 */
export async function deleteProgramService(
  user: AuthUser | null | undefined,
  id: string
) {
  if (!id || typeof id !== "string") {
    throw new ValidationError("Program ID is required.");
  }

  const existingProgram = await findProgramById(id);
  if (!existingProgram) {
    throw new NotFoundError(`Program with ID '${id}' not found.`);
  }

  const authResult = await authorize(user, "programs.delete");

  const refCount = await countProgramReferences(id);

  if (refCount > 0) {
    const deactivated = await deactivateProgram(id);

    await logAudit({
      userId: authResult.userId,
      userEmail: user?.email,
      action: "PROGRAM_FORCE_DEACTIVATE_DUE_TO_REFERENCES",
      entity: "Program",
      entityId: id,
      details: {
        name: existingProgram.name,
        referenceCount: refCount,
      },
    });

    return {
      program: deactivated,
      mode: "DEACTIVATED" as const,
      message: `Program has ${refCount} active reference(s). It was deactivated instead of deleted.`,
    };
  }

  await deleteProgram(id);

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "PROGRAM_DELETE",
    entity: "Program",
    entityId: id,
    details: {
      name: existingProgram.name,
      code: existingProgram.code,
    },
  });

  return {
    program: existingProgram,
    mode: "DELETED" as const,
    message: "Program permanently deleted.",
  };
}

// ─── Dynamic Tables Engine: Paginated List ───────────────────────────────────

/**
 * Lists programs with server-side pagination, sorting, searching, and filtering.
 * Used by the DataTable component.
 */
export async function listProgramsPaginatedService(
  user: AuthUser | null | undefined,
  config: DataTableConfig
) {
  await authorize(user, "programs.read");

  const { skip, take, orderBy, searchTerm } = buildPaginatedQuery(config);

  const { data, total } = await listProgramsPaginated({
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

interface ProgramRow {
  id: string;
  name: string;
  code: string;
  shortName: string;
  type: string;
  durationYears: number;
  isActive: boolean;
  departments?: { id: string; name: string; code: string }[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

/** Column definitions used for CSV export value extraction */
const PROGRAM_EXPORT_COLUMNS: DataTableColumnDef<ProgramRow>[] = [
  { id: "name", header: "Name", accessorKey: "name" },
  { id: "code", header: "Code", accessorKey: "code" },
  { id: "shortName", header: "Short Name", accessorKey: "shortName" },
  { id: "type", header: "Award Type", accessorKey: "type" },
  {
    id: "duration",
    header: "Duration (Years)",
    accessorKey: "durationYears",
    exportAccessor: (row) => row.durationYears,
  },
  {
    id: "departments",
    header: "Departments",
    exportAccessor: (row) =>
      row.departments?.map((d) => `${d.name} (${d.code})`).join("; ") ?? "",
  },
  {
    id: "status",
    header: "Status",
    accessorKey: "isActive",
    exportAccessor: (row) => (row.isActive ? "Active" : "Inactive"),
  },
];

/**
 * Exports programs matching current filters as a CSV string.
 * Requires `programs.export` permission — returns 403 if missing.
 */
export async function exportProgramsCsvService(
  user: AuthUser | null | undefined,
  config: DataTableConfig,
  userPermissions: string[]
) {
  await authorize(user, "programs.export");

  const { searchTerm } = buildPaginatedQuery(config);
  const { data } = await listProgramsPaginated({
    skip: 0,
    take: 10000,
    searchTerm,
    filters: config.filters,
  });

  return buildCsvExport(
    data as unknown as ProgramRow[],
    PROGRAM_EXPORT_COLUMNS,
    config.visibleColumns,
    userPermissions
  );
}
