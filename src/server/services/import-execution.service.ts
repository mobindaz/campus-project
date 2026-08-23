/**
 * Chunked Import Execution Service
 * =================================
 * Spec §20 & Correction #9:
 * - Executes upserts in chunks of ~200 rows.
 * - Implements row-level error isolation: one bad row does NOT roll back previous or subsequent rows.
 * - Configurable matching strategy (default: registerNumber, optional: email).
 * - Comprehensive logging to `import_history` and audit logs.
 */

import { authorize, AuthUser } from "@/server/authorization";
import { logAudit } from "@/server/services/audit.service";
import {
  upsertStudentByRegisterNumber,
  upsertStudentByEmail,
} from "@/server/repositories/student.repository";
import {
  createImportHistory,
  listImportHistories,
  findImportHistoryById,
} from "@/server/repositories/import-history.repository";
import { processInChunks } from "@/server/services/excel-import.service";
import type {
  ExecuteImportInput,
  FailedRowError,
  ImportExecutionResult,
  ImportHistoryRecord,
} from "@/modules/excel-import/types";

export const PERMISSION_IMPORTS_MANAGE = "imports.manage";

/**
 * Executes a chunked Student import with row-level error isolation.
 */
export async function executeStudentImportService(
  user: AuthUser | null,
  input: ExecuteImportInput
): Promise<ImportExecutionResult> {
  // Server-side authorization check
  await authorize(user, PERMISSION_IMPORTS_MANAGE);

  const matchingStrategy = input.matchingStrategy || "registerNumber";
  const chunkSize = input.chunkSize || 200;
  const skipErrors = input.skipErrors !== undefined ? input.skipErrors : true;

  const totalRows = input.rows.length;
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const failedRows: FailedRowError[] = [];

  // Filter actionable rows
  const actionableRows: Array<{
    row: Record<string, unknown>;
    originalIndex: number;
  }> = [];

  for (let i = 0; i < input.rows.length; i++) {
    const row = input.rows[i];
    const action = row.action as string | undefined;

    if (action === "SKIP") {
      skippedCount++;
      if (!skipErrors && row.errors && (row.errors as unknown[]).length > 0) {
        failedRows.push({
          rowNumber: (row.rowNumber as number) || i + 2,
          identifier: String(row.registerNumber || row.email || ""),
          error: "Row marked as skip due to validation error.",
          data: row,
        });
      }
    } else {
      actionableRows.push({ row, originalIndex: i });
    }
  }

  // Chunked batch execution with row-level error isolation
  await processInChunks(
    actionableRows,
    chunkSize,
    async (chunk, _chunkIndex, startItemIndex) => {
      const chunkResults = [];

      for (let localIdx = 0; localIdx < chunk.length; localIdx++) {
        const item = chunk[localIdx];
        const { row, originalIndex } = item;
        const rowNumber = (row.rowNumber as number) || originalIndex + 2;

        try {
          const registerNumber = String(row.registerNumber || "").trim();
          const name = String(row.name || "").trim();
          const email = row.email ? String(row.email).trim() : null;
          const phone = row.phone ? String(row.phone).trim() : null;
          const dateOfBirth =
            row.dateOfBirth instanceof Date
              ? row.dateOfBirth
              : row.dateOfBirth
                ? new Date(String(row.dateOfBirth))
                : null;
          const programId = String(row.programId || "").trim();
          const departmentId = row.departmentId
            ? String(row.departmentId).trim()
            : null;
          const batchId = String(row.batchId || "").trim();
          const academicPeriodId = String(row.academicPeriodId || "").trim();
          const customFields =
            typeof row.customFields === "object" && row.customFields !== null
              ? (row.customFields as Record<string, unknown>)
              : {};

          if (
            !registerNumber ||
            !name ||
            !programId ||
            !batchId ||
            !academicPeriodId
          ) {
            throw new Error(
              "Missing required fields (registerNumber, name, programId, batchId, academicPeriodId)."
            );
          }

          let result: { created: boolean };

          if (matchingStrategy === "email" && email) {
            result = await upsertStudentByEmail({
              registerNumber,
              name,
              email,
              phone,
              dateOfBirth,
              programId,
              departmentId,
              batchId,
              academicPeriodId,
              customFields,
            });
          } else {
            result = await upsertStudentByRegisterNumber({
              registerNumber,
              name,
              email,
              phone,
              dateOfBirth,
              programId,
              departmentId,
              batchId,
              academicPeriodId,
              customFields,
            });
          }

          if (result.created) {
            createdCount++;
          } else {
            updatedCount++;
          }

          chunkResults.push({
            item,
            index: startItemIndex + localIdx,
            success: true,
          });
        } catch (rowError: unknown) {
          // Row-level error isolation: Catch error for this row and continue processing others
          errorCount++;
          const errorMessage =
            rowError instanceof Error
              ? rowError.message
              : "Database upsert error occurred on row.";

          failedRows.push({
            rowNumber,
            identifier: String(row.registerNumber || row.email || ""),
            error: errorMessage,
            data: row,
          });

          chunkResults.push({
            item,
            index: startItemIndex + localIdx,
            success: false,
            error: errorMessage,
          });
        }
      }

      return chunkResults;
    }
  );

  // Determine overall status
  let importStatus: "COMPLETED" | "PARTIAL" | "FAILED" = "COMPLETED";
  if (errorCount > 0) {
    importStatus = createdCount + updatedCount > 0 ? "PARTIAL" : "FAILED";
  }

  // Create audit record in import_history
  const historyRecord = await createImportHistory({
    entityType: input.entityType || "STUDENT",
    fileName: input.fileName,
    fileSize: input.fileSize || null,
    uploadedById: user?.id || null,
    uploadedBy: user?.email || user?.name || "System Admin",
    matchingKey: matchingStrategy,
    totalRows,
    createdCount,
    updatedCount,
    skippedCount,
    errorCount,
    status: importStatus,
    errors: failedRows,
    metadata: input.metadata || {},
  });

  // Log system audit event
  await logAudit({
    userId: user?.id,
    userEmail: user?.email,
    action: "EXECUTE_EXCEL_IMPORT",
    entity: "import_history",
    entityId: historyRecord.id,
    details: {
      fileName: input.fileName,
      totalRows,
      createdCount,
      updatedCount,
      skippedCount,
      errorCount,
      status: importStatus,
    },
  });

  return {
    importHistoryId: historyRecord.id,
    totalRows,
    createdCount,
    updatedCount,
    skippedCount,
    errorCount,
    failedRows,
    success: importStatus !== "FAILED",
  };
}

/**
 * Lists import history entries.
 */
export async function listImportHistoryService(
  user: AuthUser | null,
  entityType?: string,
  limit?: number
): Promise<ImportHistoryRecord[]> {
  await authorize(user, PERMISSION_IMPORTS_MANAGE);

  const histories = await listImportHistories({
    entityType,
    limit,
  });

  return histories.map((h) => ({
    id: h.id,
    entityType: h.entityType,
    fileName: h.fileName,
    fileSize: h.fileSize,
    uploadedById: h.uploadedById,
    uploadedBy: h.uploadedBy,
    matchingKey: h.matchingKey,
    totalRows: h.totalRows,
    createdCount: h.createdCount,
    updatedCount: h.updatedCount,
    skippedCount: h.skippedCount,
    errorCount: h.errorCount,
    status: h.status,
    errors: h.errors,
    metadata: h.metadata,
    createdAt: h.createdAt,
  }));
}

/**
 * Fetches an import history entry by ID.
 */
export async function getImportHistoryByIdService(
  user: AuthUser | null,
  id: string
): Promise<ImportHistoryRecord | null> {
  await authorize(user, PERMISSION_IMPORTS_MANAGE);

  const h = await findImportHistoryById(id);
  if (!h) return null;

  return {
    id: h.id,
    entityType: h.entityType,
    fileName: h.fileName,
    fileSize: h.fileSize,
    uploadedById: h.uploadedById,
    uploadedBy: h.uploadedBy,
    matchingKey: h.matchingKey,
    totalRows: h.totalRows,
    createdCount: h.createdCount,
    updatedCount: h.updatedCount,
    skippedCount: h.skippedCount,
    errorCount: h.errorCount,
    status: h.status,
    errors: h.errors,
    metadata: h.metadata,
    createdAt: h.createdAt,
  };
}
