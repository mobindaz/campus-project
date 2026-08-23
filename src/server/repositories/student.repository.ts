import { prisma } from "@/server/database";
import { Prisma, Student } from "@prisma/client";

export const studentWithRelationsInclude = {
  program: true,
  department: true,
  batch: true,
  academicPeriod: true,
} satisfies Prisma.StudentInclude;

export type StudentWithRelations = Prisma.StudentGetPayload<{
  include: typeof studentWithRelationsInclude;
}>;

export async function findStudentById(
  id: string
): Promise<StudentWithRelations | null> {
  return prisma.student.findUnique({
    where: { id },
    include: studentWithRelationsInclude,
  });
}

export async function findStudentByRegisterNumber(
  registerNumber: string
): Promise<StudentWithRelations | null> {
  return prisma.student.findUnique({
    where: { registerNumber },
    include: studentWithRelationsInclude,
  });
}

export async function findStudentByEmail(
  email: string
): Promise<StudentWithRelations | null> {
  return prisma.student.findUnique({
    where: { email },
    include: studentWithRelationsInclude,
  });
}

export async function findStudentByRegisterNumberExcludeId(
  registerNumber: string,
  excludeId: string
): Promise<Student | null> {
  return prisma.student.findFirst({
    where: {
      registerNumber,
      id: { not: excludeId },
    },
  });
}

export async function findStudentByEmailExcludeId(
  email: string,
  excludeId: string
): Promise<Student | null> {
  return prisma.student.findFirst({
    where: {
      email,
      id: { not: excludeId },
    },
  });
}

export async function findStudentsByRegisterNumbers(
  registerNumbers: string[]
): Promise<Student[]> {
  if (registerNumbers.length === 0) return [];
  return prisma.student.findMany({
    where: {
      registerNumber: { in: registerNumbers },
    },
  });
}

export async function findStudentsByEmails(
  emails: string[]
): Promise<Student[]> {
  if (emails.length === 0) return [];
  return prisma.student.findMany({
    where: {
      email: { in: emails },
    },
  });
}

export interface StudentFilterParams {
  departmentId?: string | string[];
  programId?: string;
  batchId?: string;
  academicPeriodId?: string;
  isActive?: boolean;
  search?: string;
}

export function buildStudentWhereInput(
  filters: StudentFilterParams
): Prisma.StudentWhereInput {
  const where: Prisma.StudentWhereInput = {};

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters.programId) {
    where.programId = filters.programId;
  }

  if (filters.departmentId) {
    if (Array.isArray(filters.departmentId)) {
      where.departmentId = { in: filters.departmentId };
    } else {
      where.departmentId = filters.departmentId;
    }
  }

  if (filters.batchId) {
    where.batchId = filters.batchId;
  }

  if (filters.academicPeriodId) {
    where.academicPeriodId = filters.academicPeriodId;
  }

  if (filters.search && filters.search.trim().length > 0) {
    const term = filters.search.trim();
    where.OR = [
      { registerNumber: { contains: term, mode: "insensitive" } },
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function listStudents(
  where?: Prisma.StudentWhereInput,
  orderBy?: Prisma.StudentOrderByWithRelationInput
): Promise<StudentWithRelations[]> {
  return prisma.student.findMany({
    where,
    orderBy: orderBy || { createdAt: "desc" },
    include: studentWithRelationsInclude,
  });
}

export async function listStudentsPaginated(params: {
  skip: number;
  take: number;
  where?: Prisma.StudentWhereInput;
  orderBy?: Prisma.StudentOrderByWithRelationInput;
}): Promise<{ data: StudentWithRelations[]; total: number }> {
  const [data, total] = await Promise.all([
    prisma.student.findMany({
      skip: params.skip,
      take: params.take,
      where: params.where,
      orderBy: params.orderBy || { createdAt: "desc" },
      include: studentWithRelationsInclude,
    }),
    prisma.student.count({
      where: params.where,
    }),
  ]);

  return { data, total };
}

export async function countStudents(
  where?: Prisma.StudentWhereInput
): Promise<number> {
  return prisma.student.count({ where });
}

export async function countStudentReferences(id: string): Promise<number> {
  // In later phases, references from placement_registrations or tc_requests will be counted here
  if (!id) return 0;
  return 0;
}

export async function createStudent(
  data: Prisma.StudentCreateInput
): Promise<StudentWithRelations> {
  return prisma.student.create({
    data,
    include: studentWithRelationsInclude,
  });
}

export async function updateStudent(
  id: string,
  data: Prisma.StudentUpdateInput
): Promise<StudentWithRelations> {
  return prisma.student.update({
    where: { id },
    data,
    include: studentWithRelationsInclude,
  });
}

export async function deactivateStudent(
  id: string
): Promise<StudentWithRelations> {
  return prisma.student.update({
    where: { id },
    data: { isActive: false },
    include: studentWithRelationsInclude,
  });
}

export async function deleteStudent(id: string): Promise<Student> {
  return prisma.student.delete({
    where: { id },
  });
}

export async function upsertStudentByRegisterNumber(data: {
  registerNumber: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: Date | null;
  programId: string;
  departmentId?: string | null;
  batchId: string;
  academicPeriodId: string;
  customFields?: Record<string, unknown>;
  isActive?: boolean;
}): Promise<{ student: Student; created: boolean }> {
  const existing = await prisma.student.findUnique({
    where: { registerNumber: data.registerNumber },
  });

  if (existing) {
    const existingCustom =
      typeof existing.customFields === "object" &&
      existing.customFields !== null
        ? (existing.customFields as Record<string, unknown>)
        : {};
    const mergedCustom = { ...existingCustom, ...(data.customFields || {}) };

    const updated = await prisma.student.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        email: data.email !== undefined ? data.email : existing.email,
        phone: data.phone !== undefined ? data.phone : existing.phone,
        dateOfBirth:
          data.dateOfBirth !== undefined
            ? data.dateOfBirth
            : existing.dateOfBirth,
        programId: data.programId,
        departmentId: data.departmentId,
        batchId: data.batchId,
        academicPeriodId: data.academicPeriodId,
        customFields: mergedCustom as Prisma.InputJsonValue,
        isActive:
          data.isActive !== undefined ? data.isActive : existing.isActive,
      },
    });

    return { student: updated, created: false };
  }

  const created = await prisma.student.create({
    data: {
      registerNumber: data.registerNumber,
      name: data.name,
      email: data.email,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
      programId: data.programId,
      departmentId: data.departmentId,
      batchId: data.batchId,
      academicPeriodId: data.academicPeriodId,
      customFields: (data.customFields || {}) as Prisma.InputJsonValue,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });

  return { student: created, created: true };
}

export async function upsertStudentByEmail(data: {
  registerNumber: string;
  name: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: Date | null;
  programId: string;
  departmentId?: string | null;
  batchId: string;
  academicPeriodId: string;
  customFields?: Record<string, unknown>;
  isActive?: boolean;
}): Promise<{ student: Student; created: boolean }> {
  const existing = await prisma.student.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    const existingCustom =
      typeof existing.customFields === "object" &&
      existing.customFields !== null
        ? (existing.customFields as Record<string, unknown>)
        : {};
    const mergedCustom = { ...existingCustom, ...(data.customFields || {}) };

    const updated = await prisma.student.update({
      where: { id: existing.id },
      data: {
        registerNumber: data.registerNumber,
        name: data.name,
        phone: data.phone !== undefined ? data.phone : existing.phone,
        dateOfBirth:
          data.dateOfBirth !== undefined
            ? data.dateOfBirth
            : existing.dateOfBirth,
        programId: data.programId,
        departmentId: data.departmentId,
        batchId: data.batchId,
        academicPeriodId: data.academicPeriodId,
        customFields: mergedCustom as Prisma.InputJsonValue,
        isActive:
          data.isActive !== undefined ? data.isActive : existing.isActive,
      },
    });

    return { student: updated, created: false };
  }

  const created = await prisma.student.create({
    data: {
      registerNumber: data.registerNumber,
      name: data.name,
      email: data.email,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
      programId: data.programId,
      departmentId: data.departmentId,
      batchId: data.batchId,
      academicPeriodId: data.academicPeriodId,
      customFields: (data.customFields || {}) as Prisma.InputJsonValue,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });

  return { student: created, created: true };
}
