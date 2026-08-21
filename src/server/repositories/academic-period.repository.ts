import { prisma } from "@/server/database";
import { AcademicPeriodPattern, Prisma } from "@prisma/client";

export async function findAcademicPeriodById(id: string) {
  return prisma.academicPeriod.findUnique({
    where: { id },
    include: {
      program: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });
}

export async function listAcademicPeriodsByProgram(
  programId: string,
  includeInactive = false
) {
  const where: Prisma.AcademicPeriodWhereInput = { programId };
  if (!includeInactive) {
    where.isActive = true;
  }

  return prisma.academicPeriod.findMany({
    where,
    orderBy: { orderIndex: "asc" },
  });
}

export async function createAcademicPeriod(
  data: Prisma.AcademicPeriodCreateInput
) {
  return prisma.academicPeriod.create({
    data,
  });
}

export async function createManyAcademicPeriods(
  periods: {
    name: string;
    code: string;
    pattern: AcademicPeriodPattern;
    orderIndex: number;
    programId: string;
    isActive?: boolean;
  }[]
) {
  return prisma.academicPeriod.createMany({
    data: periods,
    skipDuplicates: true,
  });
}

export async function updateAcademicPeriod(
  id: string,
  data: Prisma.AcademicPeriodUpdateInput
) {
  return prisma.academicPeriod.update({
    where: { id },
    data,
  });
}

export async function reorderAcademicPeriods(
  programId: string,
  orderedIds: string[]
) {
  const updates = orderedIds.map((id, index) =>
    prisma.academicPeriod.update({
      where: { id },
      data: { orderIndex: index + 1 },
    })
  );

  return prisma.$transaction(updates);
}

export async function countAcademicPeriodReferences(
  periodId: string
): Promise<number> {
  // Placeholder for future foreign key checks (e.g. Student AcademicPeriod enrollment, Course Registration)
  void periodId;
  return 0;
}

export async function deactivateAcademicPeriod(id: string) {
  return prisma.academicPeriod.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function deleteAcademicPeriod(id: string) {
  return prisma.academicPeriod.delete({
    where: { id },
  });
}
