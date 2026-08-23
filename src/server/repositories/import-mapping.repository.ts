import { prisma } from "@/server/database";
import { ImportMapping, Prisma } from "@prisma/client";

/**
 * List all import mapping templates for an entity type.
 */
export async function listImportMappings(
  entityType?: string
): Promise<ImportMapping[]> {
  const where: Prisma.ImportMappingWhereInput = {};

  if (entityType) {
    where.entityType = entityType;
  }

  return prisma.importMapping.findMany({
    where,
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

/**
 * Find an import mapping template by ID.
 */
export async function findImportMappingById(
  id: string
): Promise<ImportMapping | null> {
  return prisma.importMapping.findUnique({
    where: { id },
  });
}

/**
 * Find an import mapping template by entityType and name.
 */
export async function findImportMappingByName(
  entityType: string,
  name: string
): Promise<ImportMapping | null> {
  return prisma.importMapping.findUnique({
    where: {
      entityType_name: {
        entityType,
        name,
      },
    },
  });
}

/**
 * Find default template for an entity type.
 */
export async function findDefaultImportMapping(
  entityType: string
): Promise<ImportMapping | null> {
  return prisma.importMapping.findFirst({
    where: {
      entityType,
      isDefault: true,
    },
  });
}

/**
 * Clear default flag for all templates of an entity type.
 */
export async function clearDefaultImportMappings(
  entityType: string
): Promise<void> {
  await prisma.importMapping.updateMany({
    where: { entityType, isDefault: true },
    data: { isDefault: false },
  });
}

/**
 * Create a new import mapping template.
 */
export async function createImportMapping(
  data: Prisma.ImportMappingCreateInput
): Promise<ImportMapping> {
  return prisma.importMapping.create({
    data,
  });
}

/**
 * Update an existing import mapping template.
 */
export async function updateImportMapping(
  id: string,
  data: Prisma.ImportMappingUpdateInput
): Promise<ImportMapping> {
  return prisma.importMapping.update({
    where: { id },
    data,
  });
}

/**
 * Delete an import mapping template by ID.
 */
export async function deleteImportMapping(id: string): Promise<ImportMapping> {
  return prisma.importMapping.delete({
    where: { id },
  });
}
