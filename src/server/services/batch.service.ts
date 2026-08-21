/**
 * REFERENCE SERVICE PATTERN - BATCHES MODULE
 * ===========================================
 * Manages student Batches (academic year, admission year, graduation year, section, program link).
 *
 * 1. Server-Side Authorization: Invokes `authorize(user, permission, context)`.
 * 2. Zod Input Validation: Parses inputs strictly via Zod schemas.
 * 3. Business Invariants: Validates program existence, unique batch codes per program, admission vs graduation years.
 * 4. Repository Layer Delegation: Delegates Prisma queries to `batch.repository.ts`.
 * 5. Platform Engine Integration: Records audit events via `logAudit()`.
 * 6. Structured Errors: Throws `AppError` subclasses.
 */

import { authorize, AuthUser } from "@/server/authorization";
import { NotFoundError, ValidationError } from "@/server/errors/app-error";
import { findProgramById } from "@/server/repositories/program.repository";
import {
  countBatchReferences,
  createBatch,
  deactivateBatch,
  deleteBatch,
  findBatchByCode,
  findBatchById,
  listBatches,
  updateBatch,
} from "@/server/repositories/batch.repository";
import { logAudit } from "@/server/services/audit.service";
import {
  batchFilterSchema,
  BatchFilterInput,
  createBatchSchema,
  CreateBatchInput,
  updateBatchSchema,
  UpdateBatchInput,
} from "@/modules/academic-structure/schemas";

/**
 * Lists all batches matching given filters after authorizing user.
 */
export async function listBatchesService(
  user: AuthUser | null | undefined,
  filters?: BatchFilterInput
) {
  const validatedFilters = batchFilterSchema.parse(filters || {});

  await authorize(user, "programs.read");

  return listBatches(validatedFilters);
}

/**
 * Gets a batch by ID after authorizing user.
 */
export async function getBatchByIdService(
  user: AuthUser | null | undefined,
  id: string
) {
  await authorize(user, "programs.read");

  if (!id || typeof id !== "string") {
    throw new ValidationError("Batch ID is required.");
  }

  const batch = await findBatchById(id);
  if (!batch) {
    throw new NotFoundError(`Batch with ID '${id}' not found.`);
  }

  return batch;
}

/**
 * Creates a new batch under a program after validating permissions and year constraints.
 */
export async function createBatchService(
  user: AuthUser | null | undefined,
  input: CreateBatchInput
) {
  const authResult = await authorize(user, "structure.manage");

  const parsed = createBatchSchema.parse(input);

  const program = await findProgramById(parsed.programId);
  if (!program) {
    throw new ValidationError(
      `Associated program '${parsed.programId}' does not exist.`
    );
  }

  if (parsed.graduationYear < parsed.admissionYear) {
    throw new ValidationError(
      "Graduation year cannot be earlier than admission year."
    );
  }

  const validatedData = {
    ...parsed,
    name: parsed.name.trim(),
    code: parsed.code.trim().toUpperCase(),
    academicYear: parsed.academicYear.trim(),
    section: parsed.section?.trim() || undefined,
  };

  const existingCode = await findBatchByCode(
    parsed.programId,
    validatedData.code
  );
  if (existingCode) {
    throw new ValidationError(
      `Batch code '${validatedData.code}' already exists under this program.`
    );
  }

  const newBatch = await createBatch({
    name: validatedData.name,
    code: validatedData.code,
    academicYear: validatedData.academicYear,
    admissionYear: validatedData.admissionYear,
    graduationYear: validatedData.graduationYear,
    section: validatedData.section,
    isActive: validatedData.isActive,
    program: {
      connect: { id: validatedData.programId },
    },
  });

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "BATCH_CREATE",
    entity: "Batch",
    entityId: newBatch.id,
    details: {
      name: newBatch.name,
      code: newBatch.code,
      programId: newBatch.programId,
      academicYear: newBatch.academicYear,
    },
  });

  return newBatch;
}

/**
 * Updates an existing batch.
 */
export async function updateBatchService(
  user: AuthUser | null | undefined,
  id: string,
  input: UpdateBatchInput
) {
  if (!id || typeof id !== "string") {
    throw new ValidationError("Batch ID is required.");
  }

  const existingBatch = await findBatchById(id);
  if (!existingBatch) {
    throw new NotFoundError(`Batch with ID '${id}' not found.`);
  }

  const authResult = await authorize(user, "structure.manage");

  const parsed = updateBatchSchema.parse(input);
  const validatedData: UpdateBatchInput = { ...parsed };
  if (parsed.name) validatedData.name = parsed.name.trim();
  if (parsed.code) validatedData.code = parsed.code.trim().toUpperCase();

  const admissionYr = parsed.admissionYear || existingBatch.admissionYear;
  const graduationYr = parsed.graduationYear || existingBatch.graduationYear;
  if (graduationYr < admissionYr) {
    throw new ValidationError(
      "Graduation year cannot be earlier than admission year."
    );
  }

  const updatedBatch = await updateBatch(id, validatedData);

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "BATCH_UPDATE",
    entity: "Batch",
    entityId: updatedBatch.id,
    details: {
      before: { name: existingBatch.name, code: existingBatch.code },
      after: { name: updatedBatch.name, code: updatedBatch.code },
    },
  });

  return updatedBatch;
}

/**
 * Deactivates a batch (soft delete).
 */
export async function deactivateBatchService(
  user: AuthUser | null | undefined,
  id: string
) {
  if (!id || typeof id !== "string") {
    throw new ValidationError("Batch ID is required.");
  }

  const existingBatch = await findBatchById(id);
  if (!existingBatch) {
    throw new NotFoundError(`Batch with ID '${id}' not found.`);
  }

  const authResult = await authorize(user, "structure.manage");

  const deactivated = await deactivateBatch(id);

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "BATCH_DEACTIVATE",
    entity: "Batch",
    entityId: id,
    details: { name: deactivated.name, code: deactivated.code },
  });

  return deactivated;
}

/**
 * Deletes or deactivates a batch depending on reference count guard (Correction #8).
 */
export async function deleteBatchService(
  user: AuthUser | null | undefined,
  id: string
) {
  if (!id || typeof id !== "string") {
    throw new ValidationError("Batch ID is required.");
  }

  const existingBatch = await findBatchById(id);
  if (!existingBatch) {
    throw new NotFoundError(`Batch with ID '${id}' not found.`);
  }

  const authResult = await authorize(user, "structure.manage");

  const refCount = await countBatchReferences(id);

  if (refCount > 0) {
    const deactivated = await deactivateBatch(id);

    await logAudit({
      userId: authResult.userId,
      userEmail: user?.email,
      action: "BATCH_FORCE_DEACTIVATE",
      entity: "Batch",
      entityId: id,
      details: { name: existingBatch.name, referenceCount: refCount },
    });

    return {
      batch: deactivated,
      mode: "DEACTIVATED" as const,
      message: `Batch has ${refCount} active student reference(s). It was deactivated instead of deleted.`,
    };
  }

  await deleteBatch(id);

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "BATCH_DELETE",
    entity: "Batch",
    entityId: id,
    details: { name: existingBatch.name, code: existingBatch.code },
  });

  return {
    batch: existingBatch,
    mode: "DELETED" as const,
    message: "Batch permanently deleted.",
  };
}
