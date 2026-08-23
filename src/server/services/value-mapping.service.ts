/**
 * Value Mapping Engine Service
 * =============================
 * Spec §18: Handles spreadsheet value variations (e.g. "CSE" vs "CS" vs "Computer Science")
 * for relational and enum fields.
 *
 * Principles:
 * - Persistent value aliases saved per entity and field in the database.
 * - Automatic resolution of exact matches and saved aliases.
 * - Heuristic candidate suggestions presented with explicit warnings.
 * - ZERO silent guessing — any unmapped value strictly requires confirmation.
 * - Batch row transformation applying confirmed target foreign keys / canonical values.
 */

import { authorize, AuthUser } from "@/server/authorization";
import { logAudit } from "@/server/services/audit.service";
import * as repo from "@/server/repositories/value-mapping.repository";
import { listDepartments } from "@/server/repositories/department.repository";
import { listPrograms } from "@/server/repositories/program.repository";
import { listBatches } from "@/server/repositories/batch.repository";
import { listAcademicPeriods } from "@/server/repositories/academic-period.repository";
import {
  findCustomFieldDefinitionByName,
  listCustomFieldDefinitions,
} from "@/server/repositories/custom-field.repository";
import { NotFoundError } from "@/server/errors/app-error";
import type {
  FieldValueResolutionItem,
  SaveValueMappingItemInput,
  TargetOption,
  ValueMappingItem,
  ValueResolutionResult,
} from "@/modules/excel-import/types";

export const PERMISSION_IMPORTS_MANAGE = "imports.manage";

// ─── Helpers for Normalization & Similarity ──────────────────────────────────

function cleanString(val: string): string {
  return val.replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeAcronym(val: string): string {
  return val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function getAcronymFromWords(phrase: string): string {
  return phrase
    .split(/[\s&/_-]+/)
    .filter(
      (w) =>
        w.length > 0 &&
        !["and", "of", "in", "&", "the"].includes(w.toLowerCase())
    )
    .map((w) => w[0].toUpperCase())
    .join("");
}

/**
 * Calculates similarity score between a raw source value and a target candidate.
 */
function calculateValueSimilarity(
  source: string,
  targetLabel: string,
  targetCode?: string
): number {
  const cleanSource = cleanString(source);
  const cleanTarget = cleanString(targetLabel);

  // Exact match
  if (cleanSource === cleanTarget) return 1.0;

  // Exact code match
  if (targetCode && cleanSource === cleanString(targetCode)) return 1.0;

  // Acronym match (e.g. "CSE" vs "Computer Science & Engineering")
  const sourceAcronym = normalizeAcronym(source);
  const targetAcronym = getAcronymFromWords(targetLabel);
  if (sourceAcronym.length >= 2 && sourceAcronym === targetAcronym) {
    return 0.9;
  }
  if (targetCode && sourceAcronym === normalizeAcronym(targetCode)) {
    return 0.95;
  }

  // Substring containment
  if (cleanTarget.includes(cleanSource) && cleanSource.length >= 3) {
    return 0.75;
  }
  if (cleanSource.includes(cleanTarget) && cleanTarget.length >= 3) {
    return 0.75;
  }

  // Token overlap & prefix abbreviation matching (e.g. "comp sci" vs "computer science")
  const sourceTokens = cleanSource
    .split(/[\s&/_-]+/)
    .filter((t) => t.length > 0);
  const targetTokens = cleanTarget
    .split(/[\s&/_-]+/)
    .filter((t) => t.length > 0);

  if (sourceTokens.length > 0 && targetTokens.length > 0) {
    let matchedScore = 0;

    for (const sToken of sourceTokens) {
      if (
        ["and", "of", "in", "&", "the", "dept", "department"].includes(sToken)
      )
        continue;

      let bestTokenMatch = 0;
      for (const tToken of targetTokens) {
        if (
          ["and", "of", "in", "&", "the", "dept", "department"].includes(tToken)
        )
          continue;

        if (sToken === tToken) {
          bestTokenMatch = 1.0;
          break;
        } else if (
          (sToken.length >= 3 && tToken.startsWith(sToken)) ||
          (tToken.length >= 3 && sToken.startsWith(tToken))
        ) {
          bestTokenMatch = Math.max(bestTokenMatch, 0.85);
        }
      }
      matchedScore += bestTokenMatch;
    }

    const meaningfulSourceCount = sourceTokens.filter(
      (t) => !["and", "of", "in", "&", "the", "dept", "department"].includes(t)
    ).length;

    if (meaningfulSourceCount > 0 && matchedScore > 0) {
      const matchRatio = matchedScore / meaningfulSourceCount;
      if (matchRatio >= 0.7) {
        return Math.max(0.6, matchRatio * 0.85);
      }
    }
  }

  return 0.0;
}

// ─── Target Options Discovery ────────────────────────────────────────────────

/**
 * Fetches available active DB records for a relational or enum field.
 */
export async function getAvailableFieldTargets(
  entityType: string,
  fieldKey: string
): Promise<TargetOption[]> {
  const upperType = entityType.toUpperCase();

  switch (fieldKey) {
    case "department": {
      const departments = await listDepartments({ includeInactive: false });
      return departments.map((d) => ({
        id: d.id,
        label: d.name,
        code: d.code,
        details: d.type,
      }));
    }

    case "program": {
      const programs = await listPrograms({ includeInactive: false });
      return programs.map((p) => ({
        id: p.id,
        label: p.name,
        code: p.code,
        details: p.shortName,
      }));
    }

    case "batch": {
      const batches = await listBatches({ includeInactive: false });
      return batches.map((b) => ({
        id: b.id,
        label: b.name,
        code: b.code,
        details: b.academicYear,
      }));
    }

    case "academicPeriod": {
      const periods = await listAcademicPeriods({ includeInactive: false });
      return periods.map((p) => ({
        id: p.id,
        label: p.name,
        code: p.code,
        details: `${p.pattern} (Order: ${p.orderIndex})`,
      }));
    }

    default: {
      // Check custom fields
      const customField = await findCustomFieldDefinitionByName(
        upperType,
        fieldKey
      );
      if (customField && customField.options) {
        let optionsList: Array<{ label: string; value: string }> = [];

        if (Array.isArray(customField.options)) {
          optionsList = customField.options.map((opt) => {
            if (typeof opt === "string") {
              return { label: opt, value: opt };
            }
            if (typeof opt === "object" && opt !== null) {
              const obj = opt as Record<string, unknown>;
              return {
                label: String(obj.label || obj.name || obj.value || ""),
                value: String(obj.value || obj.id || obj.label || ""),
              };
            }
            return { label: String(opt), value: String(opt) };
          });
        }

        return optionsList.map((opt) => ({
          id: opt.value,
          label: opt.label,
        }));
      }

      return [];
    }
  }
}

// ─── Value Resolution & Analysis Engine ──────────────────────────────────────

/**
 * Analyzes raw spreadsheet values for relational/enum fields,
 * resolves exact matches and saved aliases, and flags unmapped values with warnings.
 */
export async function analyzeAndResolveFieldValues(
  rows: Array<Record<string, unknown>>,
  fieldKeys: string[],
  entityType: string
): Promise<ValueResolutionResult> {
  const upperType = entityType.toUpperCase();
  const items: FieldValueResolutionItem[] = [];

  // Get field labels
  const customDefs = await listCustomFieldDefinitions(upperType, false);
  const customLabelMap = new Map(customDefs.map((c) => [c.name, c.label]));

  const fieldLabels: Record<string, string> = {
    department: "Department / Branch",
    program: "Program / Degree",
    batch: "Batch / Academic Year",
    academicPeriod: "Academic Period / Semester",
  };

  for (const fieldKey of fieldKeys) {
    const fieldLabel =
      fieldLabels[fieldKey] || customLabelMap.get(fieldKey) || fieldKey;

    // 1. Extract unique non-empty source values and count occurrences
    const valueCounts = new Map<string, number>();

    for (const row of rows) {
      const rawVal = row[fieldKey];
      if (rawVal !== null && rawVal !== undefined) {
        const strVal = String(rawVal).trim();
        if (strVal.length > 0) {
          valueCounts.set(strVal, (valueCounts.get(strVal) || 0) + 1);
        }
      }
    }

    if (valueCounts.size === 0) continue;

    // 2. Fetch available target records and saved aliases for this field
    const [availableTargets, savedAliases] = await Promise.all([
      getAvailableFieldTargets(upperType, fieldKey),
      repo.findValueMappingsForField(upperType, fieldKey),
    ]);

    const aliasMap = new Map(
      savedAliases.map((a) => [cleanString(a.sourceValue), a])
    );

    // 3. Resolve each unique value
    for (const [sourceValue, count] of valueCounts.entries()) {
      const cleanSource = cleanString(sourceValue);

      // Step A: Exact DB match (by ID, Code, Name, or Details)
      const exactMatch = availableTargets.find((t) => {
        return (
          t.id.toLowerCase() === cleanSource ||
          cleanString(t.label) === cleanSource ||
          (t.code && cleanString(t.code) === cleanSource) ||
          (t.details && cleanString(t.details) === cleanSource)
        );
      });

      if (exactMatch) {
        items.push({
          fieldKey,
          fieldLabel,
          sourceValue,
          occurrenceCount: count,
          status: "RESOLVED_EXACT",
          resolvedTargetId: exactMatch.id,
          resolvedTargetLabel: exactMatch.label,
          suggestedTargetId: exactMatch.id,
          suggestedTargetLabel: exactMatch.label,
          confidence: 1.0,
          availableTargets,
        });
        continue;
      }

      // Step B: Saved Alias Match
      const savedAlias = aliasMap.get(cleanSource);
      if (savedAlias) {
        // Verify that the saved target still exists in available targets
        const targetRecord = availableTargets.find(
          (t) => t.id === savedAlias.targetId
        );
        const resolvedLabel = targetRecord
          ? targetRecord.label
          : savedAlias.targetLabel;

        items.push({
          fieldKey,
          fieldLabel,
          sourceValue,
          occurrenceCount: count,
          status: "RESOLVED_ALIAS",
          resolvedTargetId: savedAlias.targetId,
          resolvedTargetLabel: resolvedLabel,
          suggestedTargetId: savedAlias.targetId,
          suggestedTargetLabel: resolvedLabel,
          confidence: 1.0,
          availableTargets,
        });
        continue;
      }

      // Step C: Heuristic Candidate Suggestion (with explicit confirmation warning)
      let bestCandidate: TargetOption | null = null;
      let highestSimilarity = 0;

      for (const target of availableTargets) {
        const score = calculateValueSimilarity(
          sourceValue,
          target.label,
          target.code
        );
        if (score > highestSimilarity && score >= 0.5) {
          highestSimilarity = score;
          bestCandidate = target;
        }
      }

      if (bestCandidate) {
        items.push({
          fieldKey,
          fieldLabel,
          sourceValue,
          occurrenceCount: count,
          status: "SUGGESTED_MATCH",
          // Not resolved yet! Requires explicit admin confirmation per spec §18
          resolvedTargetId: null,
          resolvedTargetLabel: null,
          suggestedTargetId: bestCandidate.id,
          suggestedTargetLabel: bestCandidate.label,
          confidence: highestSimilarity,
          availableTargets,
        });
      } else {
        // Step D: Unresolved Unknown Value
        items.push({
          fieldKey,
          fieldLabel,
          sourceValue,
          occurrenceCount: count,
          status: "UNRESOLVED",
          resolvedTargetId: null,
          resolvedTargetLabel: null,
          suggestedTargetId: null,
          suggestedTargetLabel: null,
          confidence: 0,
          availableTargets,
        });
      }
    }
  }

  const totalValues = items.length;
  const resolvedCount = items.filter(
    (i) => i.status === "RESOLVED_EXACT" || i.status === "RESOLVED_ALIAS"
  ).length;
  const requiresConfirmationCount = items.filter(
    (i) => i.status === "SUGGESTED_MATCH"
  ).length;
  const unresolvedCount = items.filter((i) => i.status === "UNRESOLVED").length;

  return {
    items,
    totalUniqueValues: totalValues,
    resolvedCount,
    requiresConfirmationCount,
    unresolvedCount,
    allResolved: unresolvedCount === 0 && requiresConfirmationCount === 0,
  };
}

// ─── Row Dataset Transformation ──────────────────────────────────────────────

/**
 * Transforms an array of rows by substituting raw source values with resolved target IDs.
 *
 * @param rows Parsed spreadsheet rows
 * @param valueMappings Mapping table: { [fieldKey: string]: { [sourceValue: string]: targetId } }
 */
export function applyValueMappings(
  rows: Array<Record<string, unknown>>,
  valueMappings: Record<string, Record<string, string>>
): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const transformedRow: Record<string, unknown> = { ...row };

    for (const [fieldKey, fieldMapping] of Object.entries(valueMappings)) {
      const rawVal = row[fieldKey];
      if (rawVal !== null && rawVal !== undefined) {
        const strVal = String(rawVal).trim();
        const targetId =
          fieldMapping[strVal] || fieldMapping[cleanString(strVal)];
        if (targetId !== undefined) {
          transformedRow[fieldKey] = targetId;
        }
      }
    }

    return transformedRow;
  });
}

// ─── Value Mappings Persistence & Management ─────────────────────────────────

/**
 * Saves confirmed value aliases into the database for future imports.
 */
export async function saveValueMappingsService(
  user: AuthUser | null,
  mappings: SaveValueMappingItemInput[]
): Promise<ValueMappingItem[]> {
  await authorize(user, PERMISSION_IMPORTS_MANAGE);

  const results: ValueMappingItem[] = [];

  for (const item of mappings) {
    const saved = await repo.upsertValueMapping({
      entityType: item.entityType.toUpperCase(),
      fieldKey: item.fieldKey,
      sourceValue: item.sourceValue.trim(),
      targetId: item.targetId,
      targetLabel: item.targetLabel,
    });

    results.push({
      id: saved.id,
      entityType: saved.entityType,
      fieldKey: saved.fieldKey,
      sourceValue: saved.sourceValue,
      targetId: saved.targetId,
      targetLabel: saved.targetLabel,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    });
  }

  await logAudit({
    userId: user?.id,
    userEmail: user?.email,
    action: "SAVE_VALUE_MAPPINGS",
    entity: "value_mappings",
    entityId: "bulk",
    details: { count: mappings.length },
  });

  return results;
}

/**
 * Lists persistent value mappings, optionally filtered by entityType and fieldKey.
 */
export async function listValueMappingsService(
  user: AuthUser | null,
  entityType: string,
  fieldKey?: string
): Promise<ValueMappingItem[]> {
  await authorize(user, PERMISSION_IMPORTS_MANAGE);

  const list = await repo.listValueMappings(entityType.toUpperCase(), fieldKey);

  return list.map((item) => ({
    id: item.id,
    entityType: item.entityType,
    fieldKey: item.fieldKey,
    sourceValue: item.sourceValue,
    targetId: item.targetId,
    targetLabel: item.targetLabel,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
}

/**
 * Deletes a persistent value mapping by ID.
 */
export async function deleteValueMappingService(
  user: AuthUser | null,
  id: string
): Promise<{ success: boolean; id: string }> {
  await authorize(user, PERMISSION_IMPORTS_MANAGE);

  const existing = await repo.listValueMappings();
  const target = existing.find((item) => item.id === id);
  if (!target) {
    throw new NotFoundError(`Value mapping with ID '${id}' not found.`);
  }

  await repo.deleteValueMapping(id);

  await logAudit({
    userId: user?.id,
    userEmail: user?.email,
    action: "DELETE_VALUE_MAPPING",
    entity: "value_mappings",
    entityId: id,
    details: { fieldKey: target.fieldKey, sourceValue: target.sourceValue },
  });

  return { success: true, id };
}
