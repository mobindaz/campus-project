import { prisma } from "@/server/database";
import { Prisma } from "@prisma/client";

export interface ListBatchesOptions {
  programId?: string;
  includeInactive?: boolean;
  search?: string;
}

export async function findBatchById(id: string) {
  return prisma.batch.findUnique({
    where: { id },
    include: {
      program: {
        include: {
          department: true,
        },
      },
    },
  });
}

export async function findBatchByCode(programId: string, code: string) {
  return prisma.batch.findUnique({
    where: {
      programId_code: {
        programId,
        code,
      },
    },
  });
}

export async function listBatches(options: ListBatchesOptions = {}) {
  const where: Prisma.BatchWhereInput = {};

  if (!options.includeInactive) {
    where.isActive = true;
  }

  if (options.programId) {
    where.programId = options.programId;
  }

  if (options.search && options.search.trim() !== "") {
    const term = options.search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { code: { contains: term, mode: "insensitive" } },
      { academicYear: { contains: term, mode: "insensitive" } },
      { section: { contains: term, mode: "insensitive" } },
    ];
  }

  return prisma.batch.findMany({
    where,
    include: {
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          departmentId: true,
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
    },
    orderBy: [{ admissionYear: "desc" }, { name: "asc" }],
  });
}

export async function countBatchReferences(batchId: string): Promise<number> {
  // Placeholder for future foreign key checks (e.g. Student Batch enrollment count)
  void batchId;
  return 0;
}

export async function createBatch(data: Prisma.BatchCreateInput) {
  return prisma.batch.create({
    data,
    include: {
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          departmentId: true,
        },
      },
    },
  });
}

export async function updateBatch(id: string, data: Prisma.BatchUpdateInput) {
  return prisma.batch.update({
    where: { id },
    data,
    include: {
      program: {
        select: {
          id: true,
          name: true,
          code: true,
          departmentId: true,
        },
      },
    },
  });
}

export async function deactivateBatch(id: string) {
  return prisma.batch.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function deleteBatch(id: string) {
  return prisma.batch.delete({
    where: { id },
  });
}
