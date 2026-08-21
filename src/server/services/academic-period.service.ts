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
  generateAcademicPeriodsPreviewSchema,
  GenerateAcademicPeriodsPreviewInput,
  setupWizardSubmitSchema,
  SetupWizardSubmitInput,
} from "@/modules/academic-structure/schemas";

export interface AcademicPeriodPreviewItem {
  yearNumber: number;
  periodNumber: number;
  name: string;
  code: string;
  pattern: "SEMESTER" | "YEAR";
  orderIndex: number;
}

/**
 * Pure generator function to calculate continuous academic periods based on duration and pattern.
 * - SEMESTER mode: durationYears * 2 periods with continuous semester numbers 1..N across years.
 * - YEAR mode: durationYears periods (Year 1, Year 2, Year 3).
 */
export function generatePeriodListPreview(
  durationYears: number,
  pattern: "SEMESTER" | "YEAR"
): AcademicPeriodPreviewItem[] {
  const items: AcademicPeriodPreviewItem[] = [];

  if (pattern === "SEMESTER") {
    const totalSemesters = durationYears * 2;
    for (let i = 0; i < totalSemesters; i++) {
      const semNumber = i + 1;
      const yearNumber = Math.floor(i / 2) + 1;
      items.push({
        yearNumber,
        periodNumber: semNumber,
        name: `Year ${yearNumber} - Semester ${semNumber}`,
        code: `SEM_${semNumber}`,
        pattern: "SEMESTER",
        orderIndex: semNumber,
      });
    }
  } else {
    for (let i = 0; i < durationYears; i++) {
      const yearNumber = i + 1;
      items.push({
        yearNumber,
        periodNumber: yearNumber,
        name: `Year ${yearNumber}`,
        code: `YR_${yearNumber}`,
        pattern: "YEAR",
        orderIndex: yearNumber,
      });
    }
  }

  return items;
}

/**
 * Returns a live preview of academic periods to be generated without modifying database.
 */
export async function previewGeneratedPeriodsService(
  user: AuthUser | null | undefined,
  input: GenerateAcademicPeriodsPreviewInput
) {
  await authorize(user, "structure.manage");
  const parsed = generateAcademicPeriodsPreviewSchema.parse(input);
  return generatePeriodListPreview(parsed.durationYears, parsed.pattern);
}

/**
 * Executes Setup Wizard onboarding atomically using a Prisma transaction.
 * Detects existing Programs, Departments, and Periods to avoid duplicate records.
 */
export async function executeSetupWizardTransactionService(
  user: AuthUser | null | undefined,
  input: SetupWizardSubmitInput
) {
  const authResult = await authorize(user, "settings.manage");
  const parsed = setupWizardSubmitSchema.parse(input);

  const { prisma } = await import("@/server/database");

  return prisma.$transaction(async (tx) => {
    // 1. Ensure Program (avoid duplicate Program by code or name)
    const progCode = parsed.program.code.trim().toUpperCase();
    const progName = parsed.program.name.trim();

    let program = await tx.program.findFirst({
      where: {
        OR: [{ code: progCode }, { name: progName }],
      },
    });

    if (!program) {
      program = await tx.program.create({
        data: {
          name: progName,
          code: progCode,
          shortName: parsed.program.shortName.trim(),
          type: parsed.program.type,
          durationYears: parsed.program.durationYears,
          isActive: true,
        },
      });
    } else {
      // Update duration & type on existing program
      program = await tx.program.update({
        where: { id: program.id },
        data: {
          durationYears: parsed.program.durationYears,
          type: parsed.program.type,
        },
      });
    }

    // 2. Ensure Departments (avoid duplicate Department by code or name)
    const createdDepts = [];
    if (parsed.departments && parsed.departments.length > 0) {
      for (const d of parsed.departments) {
        const dCode = d.code.trim().toUpperCase();
        const dName = d.name.trim();

        let dept = await tx.department.findFirst({
          where: {
            OR: [{ code: dCode }, { name: dName }],
          },
        });

        if (!dept) {
          dept = await tx.department.create({
            data: {
              name: dName,
              code: dCode,
              description: d.description?.trim() || null,
              type: "ACADEMIC",
              programId: program.id,
              isActive: true,
            },
          });
        } else {
          dept = await tx.department.update({
            where: { id: dept.id },
            data: {
              programId: program.id,
            },
          });
        }
        createdDepts.push(dept);
      }
    }

    // 3. Generate & Create Academic Periods (avoid duplicate periods by programId_code)
    const periodPreviews = generatePeriodListPreview(
      program.durationYears,
      parsed.periodPattern
    );

    const createdPeriods = [];
    for (const item of periodPreviews) {
      let period = await tx.academicPeriod.findUnique({
        where: {
          programId_code: {
            programId: program.id,
            code: item.code,
          },
        },
      });

      if (!period) {
        period = await tx.academicPeriod.create({
          data: {
            name: item.name,
            code: item.code,
            pattern: item.pattern,
            orderIndex: item.orderIndex,
            programId: program.id,
            isActive: true,
          },
        });
      }
      createdPeriods.push(period);
    }

    // 4. Mark College Profile as configured
    await tx.collegeProfile.updateMany({
      data: { isConfigured: true },
    });

    await logAudit({
      userId: authResult.userId,
      userEmail: user?.email,
      action: "SETUP_WIZARD_EXECUTE",
      entity: "Program",
      entityId: program.id,
      details: {
        programCode: program.code,
        departmentCount: createdDepts.length,
        periodCount: createdPeriods.length,
        pattern: parsed.periodPattern,
      },
    });

    return {
      program,
      departments: createdDepts,
      periods: createdPeriods,
    };
  });
}

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

  await authorize(user, "programs.read");

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

  const authResult = await authorize(user, "structure.manage");

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

  const authResult = await authorize(user, "structure.manage");

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

  const authResult = await authorize(user, "structure.manage");

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

  const authResult = await authorize(user, "structure.manage");

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

  const authResult = await authorize(user, "structure.manage");

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

  const authResult = await authorize(user, "structure.manage");

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
