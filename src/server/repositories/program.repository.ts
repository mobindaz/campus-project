import { prisma } from "@/server/database";
import { ProgramType, Prisma } from "@prisma/client";

export interface ListProgramsOptions {
  type?: ProgramType;
  includeInactive?: boolean;
  search?: string;
}

export async function findProgramById(id: string) {
  return prisma.program.findUnique({
    where: { id },
    include: {
      departments: true,
    },
  });
}

export async function findProgramByCode(code: string) {
  return prisma.program.findUnique({
    where: { code },
    include: {
      departments: true,
    },
  });
}

export async function findProgramByName(name: string) {
  return prisma.program.findUnique({
    where: { name },
    include: {
      departments: true,
    },
  });
}

export async function listPrograms(options: ListProgramsOptions = {}) {
  const where: Prisma.ProgramWhereInput = {};

  if (!options.includeInactive) {
    where.isActive = true;
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
      departments: {
        select: {
          id: true,
          name: true,
          code: true,
          isActive: true,
        },
      },
    },
    orderBy: [{ name: "asc" }],
  });
}

/**
 * Counts foreign key references to a program across academic tables
 */
export async function countProgramReferences(
  programId: string
): Promise<number> {
  const [departmentsCount, periodsCount, batchesCount, studentsCount] =
    await Promise.all([
      prisma.department.count({ where: { programId } }),
      prisma.academicPeriod.count({ where: { programId } }),
      prisma.batch.count({ where: { programId } }),
      prisma.student.count({ where: { programId } }),
    ]);

  return departmentsCount + periodsCount + batchesCount + studentsCount;
}

export async function createProgram(data: Prisma.ProgramCreateInput) {
  return prisma.program.create({
    data,
    include: {
      departments: true,
    },
  });
}

export async function updateProgram(
  id: string,
  data: Prisma.ProgramUpdateInput
) {
  return prisma.program.update({
    where: { id },
    data,
    include: {
      departments: true,
    },
  });
}

export async function deactivateProgram(id: string) {
  return prisma.program.update({
    where: { id },
    data: { isActive: false },
    include: {
      departments: true,
    },
  });
}

export async function deleteProgram(id: string) {
  return prisma.program.delete({
    where: { id },
  });
}

// ─── Paginated Query (Dynamic Tables Engine) ─────────────────────────────────

export interface ListProgramsPaginatedOptions {
  skip: number;
  take: number;
  orderBy?: Record<string, "asc" | "desc">;
  searchTerm?: string;
  filters?: Record<string, string>;
}

export async function listProgramsPaginated(
  options: ListProgramsPaginatedOptions
): Promise<{
  data: Awaited<ReturnType<typeof prisma.program.findMany>>;
  total: number;
}> {
  const where: Prisma.ProgramWhereInput = {};

  // Search across name, code, shortName
  if (options.searchTerm) {
    where.OR = [
      { name: { contains: options.searchTerm, mode: "insensitive" } },
      { code: { contains: options.searchTerm, mode: "insensitive" } },
      { shortName: { contains: options.searchTerm, mode: "insensitive" } },
    ];
  }

  // Column-based filters
  if (options.filters) {
    if (options.filters.type) {
      where.type = options.filters.type as ProgramType;
    }
    if (options.filters.isActive === "true") {
      where.isActive = true;
    } else if (options.filters.isActive === "false") {
      where.isActive = false;
    }
  }

  // Default sort: name asc
  const orderBy = options.orderBy
    ? [options.orderBy, { name: "asc" as const }]
    : [{ name: "asc" as const }];

  const [data, total] = await Promise.all([
    prisma.program.findMany({
      where,
      include: {
        departments: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
          },
        },
      },
      orderBy,
      skip: options.skip,
      take: options.take,
    }),
    prisma.program.count({ where }),
  ]);

  return { data, total };
}
