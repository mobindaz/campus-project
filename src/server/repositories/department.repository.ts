import { prisma } from "@/server/database";
import { DepartmentType, Prisma } from "@prisma/client";

export interface ListDepartmentsOptions {
  includeInactive?: boolean;
  search?: string;
  type?: DepartmentType;
}

export async function findDepartmentById(id: string) {
  return prisma.department.findUnique({
    where: { id },
  });
}

export async function findDepartmentByCode(code: string) {
  return prisma.department.findUnique({
    where: { code },
  });
}

export async function findDepartmentByName(name: string) {
  return prisma.department.findUnique({
    where: { name },
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
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

/**
 * Counts total foreign key references to a department across the system
 * to determine whether a hard delete is safe (0 references) or if deactivation is required.
 */
export async function countDepartmentReferences(departmentId: string): Promise<number> {
  const userScopesCount = await prisma.userDepartmentScope.count({
    where: { departmentId },
  });

  return userScopesCount;
}

export async function createDepartment(data: Prisma.DepartmentCreateInput) {
  return prisma.department.create({
    data,
  });
}

export async function updateDepartment(id: string, data: Prisma.DepartmentUpdateInput) {
  return prisma.department.update({
    where: { id },
    data,
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
