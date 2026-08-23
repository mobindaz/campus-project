import { prisma } from "@/server/database";
import { DepartmentType, Prisma } from "@prisma/client";

export interface ListDepartmentsOptions {
  includeInactive?: boolean;
  search?: string;
  type?: DepartmentType;
  programId?: string;
}

export async function findDepartmentById(id: string) {
  return prisma.department.findUnique({
    where: { id },
    include: {
      program: true,
    },
  });
}

export async function findDepartmentByCode(code: string) {
  return prisma.department.findUnique({
    where: { code },
    include: {
      program: true,
    },
  });
}

export async function findDepartmentByName(name: string) {
  return prisma.department.findUnique({
    where: { name },
    include: {
      program: true,
    },
  });
}

export async function listDepartments(options: ListDepartmentsOptions = {}) {
  const where: Prisma.DepartmentWhereInput = {};

  if (!options.includeInactive) {
    where.isActive = true;
  }

  if (options.type) {
    where.type = options.type;
  }

  if (options.programId) {
    where.programId = options.programId;
  }

  if (options.search && options.search.trim() !== "") {
    const term = options.search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { code: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
    ];
  }

  return prisma.department.findMany({
    where,
    include: {
      program: true,
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

/**
 * Counts total foreign key references to a department across the system
 * to determine whether a hard delete is safe (0 references) or if deactivation is required.
 */
export async function countDepartmentReferences(
  departmentId: string
): Promise<number> {
  const [userScopesCount, studentsCount] = await Promise.all([
    prisma.userDepartmentScope.count({ where: { departmentId } }),
    prisma.student.count({ where: { departmentId } }),
  ]);

  return userScopesCount + studentsCount;
}

export async function createDepartment(data: Prisma.DepartmentCreateInput) {
  return prisma.department.create({
    data,
    include: {
      program: true,
    },
  });
}

export async function updateDepartment(
  id: string,
  data: Prisma.DepartmentUpdateInput
) {
  return prisma.department.update({
    where: { id },
    data,
    include: {
      program: true,
    },
  });
}

export async function deactivateDepartment(id: string) {
  return prisma.department.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function deleteDepartment(id: string) {
  return prisma.department.delete({
    where: { id },
  });
}

// ─── Paginated Query (Dynamic Tables Engine) ─────────────────────────────────

export interface ListDepartmentsPaginatedOptions {
  skip: number;
  take: number;
  orderBy?: Record<string, "asc" | "desc">;
  searchTerm?: string;
  filters?: Record<string, string>;
}

export async function listDepartmentsPaginated(
  options: ListDepartmentsPaginatedOptions
): Promise<{
  data: Awaited<ReturnType<typeof prisma.department.findMany>>;
  total: number;
}> {
  const where: Prisma.DepartmentWhereInput = {};

  // Search across name, code, description
  if (options.searchTerm) {
    where.OR = [
      { name: { contains: options.searchTerm, mode: "insensitive" } },
      { code: { contains: options.searchTerm, mode: "insensitive" } },
      { description: { contains: options.searchTerm, mode: "insensitive" } },
    ];
  }

  // Column-based filters
  if (options.filters) {
    if (options.filters.type) {
      where.type = options.filters.type as DepartmentType;
    }
    if (options.filters.isActive === "true") {
      where.isActive = true;
    } else if (options.filters.isActive === "false") {
      where.isActive = false;
    }
  }

  // Default sort: type asc, name asc
  const orderBy = options.orderBy
    ? [options.orderBy, { name: "asc" as const }]
    : [{ type: "asc" as const }, { name: "asc" as const }];

  const [data, total] = await Promise.all([
    prisma.department.findMany({
      where,
      include: { program: true },
      orderBy,
      skip: options.skip,
      take: options.take,
    }),
    prisma.department.count({ where }),
  ]);

  return { data, total };
}
