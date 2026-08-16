import { prisma } from "@/server/database";
import { ProgramType, Prisma } from "@prisma/client";

export interface ListProgramsOptions {
  departmentId?: string;
  type?: ProgramType;
  includeInactive?: boolean;
  search?: string;
}

export async function findProgramById(id: string) {
  return prisma.program.findUnique({
    where: { id },
    include: {
      department: true,
    },
  });
}

export async function findProgramByCode(code: string) {
  return prisma.program.findUnique({
    where: { code },
  });
}

export async function findProgramByName(name: string) {
  return prisma.program.findUnique({
    where: { name },
  });
}

export async function listPrograms(options: ListProgramsOptions = {}) {
  const where: Prisma.ProgramWhereInput = {};

  if (!options.includeInactive) {
    where.isActive = true;
  }

  if (options.departmentId) {
    where.departmentId = options.departmentId;
  }

  if (options.type) {
    where.type = options.type;
  }

  if (options.search && options.search.trim() !== "") {
    const term = options.search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { code: { contains: term, mode: "insensitive" } },
      { shortName: { contains: term, mode: "insensitive" } },
    ];
  }

  return prisma.program.findMany({
    where,
    include: {
      department: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
  });
}

/**
 * Counts foreign key references to a program across future tables (Student, Batch, etc.)
 */
export async function countProgramReferences(programId: string): Promise<number> {
  // Placeholder for future foreign key checks (e.g. Student count, Batch count)
  return 0;
}

export async function createProgram(data: Prisma.ProgramCreateInput) {
  return prisma.program.create({
    data,
    include: {
      department: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });
}

export async function updateProgram(id: string, data: Prisma.ProgramUpdateInput) {
  return prisma.program.update({
    where: { id },
    data,
    include: {
      department: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });
}

export async function deactivateProgram(id: string) {
  return prisma.program.update({
    where: { id },
    data: { isActive: false },
    include: {
      department: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });
}

export async function deleteProgram(id: string) {
  return prisma.program.delete({
    where: { id },
  });
}
