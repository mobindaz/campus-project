import { prisma } from "@/server/database";
import { Prisma, Student } from "@prisma/client";

export async function findStudentById(id: string): Promise<Student | null> {
  return prisma.student.findUnique({
    where: { id },
    include: {
      program: true,
      department: true,
      batch: true,
      academicPeriod: true,
    },
  });
}

export async function findStudentByRegisterNumber(
  registerNumber: string
): Promise<Student | null> {
  return prisma.student.findUnique({
    where: { registerNumber },
    include: {
      program: true,
      department: true,
      batch: true,
      academicPeriod: true,
    },
  });
}

export async function findStudentByEmail(
  email: string
): Promise<Student | null> {
  return prisma.student.findUnique({
    where: { email },
    include: {
      program: true,
      department: true,
      batch: true,
      academicPeriod: true,
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

export async function createStudent(
  data: Prisma.StudentCreateInput
): Promise<Student> {
  return prisma.student.create({
    data,
  });
}

export async function updateStudent(
  id: string,
  data: Prisma.StudentUpdateInput
): Promise<Student> {
  return prisma.student.update({
    where: { id },
    data,
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
    // Merge existing customFields with updated customFields
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
