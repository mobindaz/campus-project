import { prisma } from "@/server/database";
import { ImportHistory, Prisma } from "@prisma/client";

export interface CreateImportHistoryInput {
  entityType: string;
  fileName: string;
  fileSize?: number | null;
  uploadedById?: string | null;
  uploadedBy: string;
  matchingKey: string;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  status: "COMPLETED" | "PARTIAL" | "FAILED";
  errors?: unknown;
  metadata?: unknown;
}

export async function createImportHistory(
  data: CreateImportHistoryInput
): Promise<ImportHistory> {
  return prisma.importHistory.create({
    data: {
      entityType: data.entityType,
      fileName: data.fileName,
      fileSize: data.fileSize,
      uploadedById: data.uploadedById,
      uploadedBy: data.uploadedBy,
      matchingKey: data.matchingKey,
      totalRows: data.totalRows,
      createdCount: data.createdCount,
      updatedCount: data.updatedCount,
      skippedCount: data.skippedCount,
      errorCount: data.errorCount,
      status: data.status,
      errors: (data.errors || []) as Prisma.InputJsonValue,
      metadata: (data.metadata || {}) as Prisma.InputJsonValue,
    },
  });
}

export async function listImportHistories(options?: {
  entityType?: string;
  limit?: number;
}): Promise<ImportHistory[]> {
  const where: Prisma.ImportHistoryWhereInput = {};

  if (options?.entityType) {
    where.entityType = options.entityType;
  }

  return prisma.importHistory.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options?.limit || 50,
  });
}

export async function findImportHistoryById(
  id: string
): Promise<ImportHistory | null> {
  return prisma.importHistory.findUnique({
    where: { id },
  });
}
