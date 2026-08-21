import { prisma } from "@/server/database";
import { CustomFieldDefinition, Prisma } from "@prisma/client";

/**
 * List custom field definitions, optionally filtered by entityType and active status.
 */
export async function listCustomFieldDefinitions(
  entityType?: string,
  includeInactive: boolean = false
): Promise<CustomFieldDefinition[]> {
  const where: Prisma.CustomFieldDefinitionWhereInput = {};

  if (entityType) {
    where.entityType = entityType;
  }

  if (!includeInactive) {
    where.isActive = true;
  }

  return prisma.customFieldDefinition.findMany({
    where,
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

/**
 * Find a custom field definition by ID.
 */
export async function findCustomFieldDefinitionById(
  id: string
): Promise<CustomFieldDefinition | null> {
  return prisma.customFieldDefinition.findUnique({
    where: { id },
  });
}

/**
 * Find a custom field definition by entityType and name.
 */
export async function findCustomFieldDefinitionByName(
  entityType: string,
  name: string
): Promise<CustomFieldDefinition | null> {
  return prisma.customFieldDefinition.findUnique({
    where: {
      entityType_name: {
        entityType,
        name,
      },
    },
  });
}

/**
 * Create a new custom field definition.
 */
export async function createCustomFieldDefinition(
  data: Prisma.CustomFieldDefinitionCreateInput
): Promise<CustomFieldDefinition> {
  return prisma.customFieldDefinition.create({
    data,
  });
}

/**
 * Update an existing custom field definition.
 */
export async function updateCustomFieldDefinition(
  id: string,
  data: Prisma.CustomFieldDefinitionUpdateInput
): Promise<CustomFieldDefinition> {
  return prisma.customFieldDefinition.update({
    where: { id },
    data,
  });
}

/**
 * Delete a custom field definition.
 */
export async function deleteCustomFieldDefinition(
  id: string
): Promise<CustomFieldDefinition> {
  return prisma.customFieldDefinition.delete({
    where: { id },
  });
}

/**
 * Reorder custom field definitions by updated order index.
 */
export async function reorderCustomFieldDefinitions(
  entityType: string,
  orderedIds: string[]
): Promise<void> {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.customFieldDefinition.update({
        where: { id, entityType },
        data: { order: index },
      })
    )
  );
}
