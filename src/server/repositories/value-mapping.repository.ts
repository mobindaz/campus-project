import { prisma } from "@/server/database";
import { ValueMapping, Prisma } from "@prisma/client";

/**
 * List all persistent value mapping aliases, optionally filtered by entityType and fieldKey.
 */
export async function listValueMappings(
  entityType?: string,
  fieldKey?: string
): Promise<ValueMapping[]> {
  const where: Prisma.ValueMappingWhereInput = {};

  if (entityType) {
    where.entityType = entityType;
  }

  if (fieldKey) {
    where.fieldKey = fieldKey;
  }

  return prisma.valueMapping.findMany({
    where,
    orderBy: [{ fieldKey: "asc" }, { sourceValue: "asc" }],
  });
}

/**
 * Find a specific value mapping alias.
 */
export async function findValueMapping(
  entityType: string,
  fieldKey: string,
  sourceValue: string
): Promise<ValueMapping | null> {
  return prisma.valueMapping.findUnique({
    where: {
      entityType_fieldKey_sourceValue: {
        entityType,
        fieldKey,
        sourceValue,
      },
    },
  });
}

/**
 * Find all value mapping aliases for a specific field on an entity.
 */
export async function findValueMappingsForField(
  entityType: string,
  fieldKey: string
): Promise<ValueMapping[]> {
  return prisma.valueMapping.findMany({
    where: {
      entityType,
      fieldKey,
    },
  });
}

/**
 * Upsert a value mapping alias (insert or update target).
 */
export async function upsertValueMapping(data: {
  entityType: string;
  fieldKey: string;
  sourceValue: string;
  targetId: string;
  targetLabel: string;
}): Promise<ValueMapping> {
  return prisma.valueMapping.upsert({
    where: {
      entityType_fieldKey_sourceValue: {
        entityType: data.entityType,
        fieldKey: data.fieldKey,
        sourceValue: data.sourceValue,
      },
    },
    create: {
      entityType: data.entityType,
      fieldKey: data.fieldKey,
      sourceValue: data.sourceValue,
      targetId: data.targetId,
      targetLabel: data.targetLabel,
    },
    update: {
      targetId: data.targetId,
      targetLabel: data.targetLabel,
    },
  });
}

/**
 * Delete a value mapping alias by ID.
 */
export async function deleteValueMapping(id: string): Promise<ValueMapping> {
  return prisma.valueMapping.delete({
    where: { id },
  });
}
