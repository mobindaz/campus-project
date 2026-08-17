/**
 * REFERENCE SERVICE PATTERN - ACADEMIC PERIODS ENGINE
 * ====================================================
 * Configures program-specific Academic Periods (Semester, Year, Term, Trimester, Custom).
 * Ensures period counts are NEVER hardcoded and period ordering is dynamic per program.
 *
 * 1. Server-Side Authorization: Invokes `authorize(user, permission, context)`.
 * 2. Zod Input Validation: Parses inputs strictly.
 * 3. Business Logic & Invariants: Validates program existence, unique codes per program, order indices.
 * 4. Repository Layer Delegation: Delegates queries to `academic-period.repository.ts`.
 * 5. Platform Engine Integration: Records audit events via `logAudit()`.
 * 6. Structured Errors: Throws `AppError` subclasses.
 */

import { authorize, AuthUser } from "@/server/authorization";
import { NotFoundError, ValidationError } from "@/server/errors/app-error";
import { findProgramById } from "@/server/repositories/program.repository";
import {
  countAcademicPeriodReferences,
  createAcademicPeriod,
  createManyAcademicPeriods,
  deactivateAcademicPeriod,
  deleteAcademicPeriod,
  findAcademicPeriodById,
  listAcademicPeriodsByProgram,
  reorderAcademicPeriods,
  updateAcademicPeriod,
} from "@/server/repositories/academic-period.repository";
import { logAudit } from "@/server/services/audit.service";
import {
  createAcademicPeriodSchema,
  CreateAcademicPeriodInput,
  generatePeriodsSchema,
  GeneratePeriodsInput,
  reorderAcademicPeriodsSchema,
  ReorderAcademicPeriodsInput,
  updateAcademicPeriodSchema,
  UpdateAcademicPeriodInput,
} from "@/modules/academic-structure/schemas";

/**
 * Lists all academic periods configured for a program ordered by index.
 */
export async function listAcademicPeriodsService(
  user: AuthUser | null | undefined,
  programId: string,
  includeInactive = false
) {
  if (!programId || typeof programId !== "string") {
    throw new ValidationError("Program ID is required.");
  }

  const program = await findProgramById(programId);
  if (!program) {
    throw new NotFoundError(`Program with ID '${programId}' not found.`);
  }

  await authorize(user, "programs.read", {
    departmentId: program.departmentId,
  });

  return listAcademicPeriodsByProgram(programId, includeInactive);
}

/**
 * Creates a single academic period under a program.
 */
export async function createAcademicPeriodService(
  user: AuthUser | null | undefined,
  input: CreateAcademicPeriodInput
) {
  const parsed = createAcademicPeriodSchema.parse(input);

  const program = await findProgramById(parsed.programId);
  if (!program) {
    throw new ValidationError(
      `Associated program '${parsed.programId}' does not exist.`
    );
  }

  const authResult = await authorize(user, "structure.manage", {
    departmentId: program.departmentId,
  });

  const validatedData = {
    ...parsed,
    name: parsed.name.trim(),
    code: parsed.code.trim().toUpperCase(),
  };

  const period = await createAcademicPeriod({
    name: validatedData.name,
    code: validatedData.code,
    pattern: validatedData.pattern,
    orderIndex: validatedData.orderIndex,
    isActive: validatedData.isActive,
    program: {
      connect: { id: validatedData.programId },
    },
  });

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "ACADEMIC_PERIOD_CREATE",
    entity: "AcademicPeriod",
    entityId: period.id,
    details: {
      name: period.name,
      code: period.code,
      programId: period.programId,
      orderIndex: period.orderIndex,
    },
  });

  return period;
}

/**
 * Convenience helper to generate N sequential academic periods for a program (e.g. 6 Semesters or 3 Years).
 */
export async function generateDefaultPeriodsService(
  user: AuthUser | null | undefined,
  input: GeneratePeriodsInput
) {
  const parsed = generatePeriodsSchema.parse(input);

  const program = await findProgramById(parsed.programId);
  if (!program) {
    throw new ValidationError(
      `Associated program '${parsed.programId}' does not exist.`
    );
  }

  const authResult = await authorize(user, "structure.manage", {
    departmentId: program.departmentId,
  });

  const existingPeriods = await listAcademicPeriodsByProgram(
    parsed.programId,
    true
  );
  const startOrder = existingPeriods.length + 1;

  const newPeriods = [];
  const patternPrefixMap: Record<
    string,
    { namePrefix: string; codePrefix: string }
  > = {
    SEMESTER: { namePrefix: "Semester ", codePrefix: "SEM_" },
    YEAR: { namePrefix: "Year ", codePrefix: "YR_" },
    TERM: { namePrefix: "Term ", codePrefix: "TERM_" },
    TRIMESTER: { namePrefix: "Trimester ", codePrefix: "TRI_" },
    CUSTOM: { namePrefix: "Period ", codePrefix: "PER_" },
  };

  const prefix = patternPrefixMap[parsed.pattern] || {
    namePrefix: "Period ",
    codePrefix: "PER_",
  };

  for (let i = 0; i < parsed.count; i++) {
    const idx = startOrder + i;
    newPeriods.push({
      name: `${prefix.namePrefix}${idx}`,
      code: `${prefix.codePrefix}${idx}`,
      pattern: parsed.pattern,
      orderIndex: idx,
      programId: parsed.programId,
      isActive: true,
    });
  }

  await createManyAcademicPeriods(newPeriods);

  const updatedPeriods = await listAcademicPeriodsByProgram(
    parsed.programId,
    true
  );

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "ACADEMIC_PERIOD_BULK_GENERATE",
    entity: "AcademicPeriod",
    entityId: parsed.programId,
    details: {
      pattern: parsed.pattern,
      count: parsed.count,
      generatedCount: newPeriods.length,
    },
  });

  return updatedPeriods;
}

/**
 * Updates an academic period (name, code, pattern, status).
 */
export async function updateAcademicPeriodService(
  user: AuthUser | null | undefined,
  id: string,
  input: UpdateAcademicPeriodInput
) {
  if (!id || typeof id !== "string") {
    throw new ValidationError("Academic period ID is required.");
  }

  const existingPeriod = await findAcademicPeriodById(id);
  if (!existingPeriod) {
    throw new NotFoundError(`Academic period with ID '${id}' not found.`);
  }

  const authResult = await authorize(user, "structure.manage", {
    departmentId: existingPeriod.program.departmentId,
  });

  const parsed = updateAcademicPeriodSchema.parse(input);
  const validatedData: UpdateAcademicPeriodInput = { ...parsed };
  if (parsed.name) validatedData.name = parsed.name.trim();
  if (parsed.code) validatedData.code = parsed.code.trim().toUpperCase();

  const updated = await updateAcademicPeriod(id, validatedData);

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "ACADEMIC_PERIOD_UPDATE",
    entity: "AcademicPeriod",
    entityId: id,
    details: {
      before: { name: existingPeriod.name, code: existingPeriod.code },
      after: { name: updated.name, code: updated.code },
    },
  });

  return updated;
}

/**
 * Reorders academic periods for a program based on array of period IDs.
 */
export async function reorderAcademicPeriodsService(
  user: AuthUser | null | undefined,
  input: ReorderAcademicPeriodsInput
) {
  const parsed = reorderAcademicPeriodsSchema.parse(input);

  const program = await findProgramById(parsed.programId);
  if (!program) {
    throw new ValidationError(`Program '${parsed.programId}' not found.`);
  }

  const authResult = await authorize(user, "structure.manage", {
    departmentId: program.departmentId,
  });

  await reorderAcademicPeriods(parsed.programId, parsed.orderedIds);

  const reorderedList = await listAcademicPeriodsByProgram(
    parsed.programId,
    true
  );

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "ACADEMIC_PERIOD_REORDER",
    entity: "AcademicPeriod",
    entityId: parsed.programId,
    details: {
      orderedIds: parsed.orderedIds,
    },
  });

  return reorderedList;
}

/**
 * Deactivates an academic period (soft delete).
 */
export async function deactivateAcademicPeriodService(
  user: AuthUser | null | undefined,
  id: string
) {
  if (!id || typeof id !== "string") {
    throw new ValidationError("Academic period ID is required.");
  }

  const existingPeriod = await findAcademicPeriodById(id);
  if (!existingPeriod) {
    throw new NotFoundError(`Academic period with ID '${id}' not found.`);
  }

  const authResult = await authorize(user, "structure.manage", {
    departmentId: existingPeriod.program.departmentId,
  });

  const deactivated = await deactivateAcademicPeriod(id);

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "ACADEMIC_PERIOD_DEACTIVATE",
    entity: "AcademicPeriod",
    entityId: id,
    details: { name: deactivated.name, code: deactivated.code },
  });

  return deactivated;
}

/**
 * Deletes or deactivates an academic period depending on reference check guard (Correction #8).
 */
export async function deleteAcademicPeriodService(
  user: AuthUser | null | undefined,
  id: string
) {
  if (!id || typeof id !== "string") {
    throw new ValidationError("Academic period ID is required.");
  }

  const existingPeriod = await findAcademicPeriodById(id);
  if (!existingPeriod) {
    throw new NotFoundError(`Academic period with ID '${id}' not found.`);
  }

  const authResult = await authorize(user, "structure.manage", {
    departmentId: existingPeriod.program.departmentId,
  });

  const refCount = await countAcademicPeriodReferences(id);

  if (refCount > 0) {
    const deactivated = await deactivateAcademicPeriod(id);

    await logAudit({
      userId: authResult.userId,
      userEmail: user?.email,
      action: "ACADEMIC_PERIOD_FORCE_DEACTIVATE",
      entity: "AcademicPeriod",
      entityId: id,
      details: { name: existingPeriod.name, referenceCount: refCount },
    });

    return {
      period: deactivated,
      mode: "DEACTIVATED" as const,
      message: `Academic period has ${refCount} active reference(s). It was deactivated instead of deleted.`,
    };
  }

  await deleteAcademicPeriod(id);

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "ACADEMIC_PERIOD_DELETE",
    entity: "AcademicPeriod",
    entityId: id,
    details: { name: existingPeriod.name, code: existingPeriod.code },
  });

  return {
    period: existingPeriod,
    mode: "DELETED" as const,
    message: "Academic period permanently deleted.",
  };
}
