/**
 * Column Mapping Engine Service
 * ==============================
 * Spec §14–15: Turns arbitrary spreadsheet headers into canonical system field names.
 *
 * Capabilities:
 * - Canonical field registry per entity type (starting with Student, extensible to all entities)
 * - Dynamic integration of custom fields from custom_field_definitions
 * - Seeded alias dictionary per spec §15
 * - Prioritized auto-suggestion algorithm (Exact -> Case-insensitive -> Trimmed -> Normalized -> Alias -> Template)
 * - Reusable mapping template persistence & auto-suggestion based on header overlap
 * - Data row transformation helper (applyColumnMapping)
 */

import { authorize, AuthUser } from "@/server/authorization";
import { logAudit } from "@/server/services/audit.service";
import { listCustomFieldDefinitions } from "@/server/repositories/custom-field.repository";
import * as repo from "@/server/repositories/import-mapping.repository";
import { NotFoundError } from "@/server/errors/app-error";
import type {
  CanonicalField,
  ColumnMappingResult,
  ColumnMappingSuggestion,
  ImportMappingTemplate,
  SaveMappingTemplateInput,
  ExcelRawRow,
} from "@/modules/excel-import/types";

export const PERMISSION_IMPORTS_MANAGE = "imports.manage";

// ─── Canonical Core Fields Registry ──────────────────────────────────────────

const CORE_CANONICAL_FIELDS: Record<string, CanonicalField[]> = {
  STUDENT: [
    {
      key: "registerNumber",
      label: "Register Number / Roll No.",
      type: "TEXT",
      required: true,
      isCustom: false,
      description: "Unique student register, roll, or admission number",
      entityType: "STUDENT",
    },
    {
      key: "name",
      label: "Student Full Name",
      type: "TEXT",
      required: true,
      isCustom: false,
      description: "Full official name of the student",
      entityType: "STUDENT",
    },
    {
      key: "dateOfBirth",
      label: "Date of Birth",
      type: "DATE",
      required: false,
      isCustom: false,
      description: "Student date of birth (YYYY-MM-DD)",
      entityType: "STUDENT",
    },
    {
      key: "department",
      label: "Department / Branch",
      type: "RELATION",
      required: false,
      isCustom: false,
      description: "Academic department code or name (e.g. CSE)",
      entityType: "STUDENT",
    },
    {
      key: "program",
      label: "Program / Degree",
      type: "RELATION",
      required: true,
      isCustom: false,
      description: "Program code or name (e.g. BTECH_CSE)",
      entityType: "STUDENT",
    },
    {
      key: "batch",
      label: "Batch / Admission Year",
      type: "RELATION",
      required: true,
      isCustom: false,
      description: "Batch code or name (e.g. BATCH-2022-2026)",
      entityType: "STUDENT",
    },
    {
      key: "academicPeriod",
      label: "Academic Period / Semester",
      type: "RELATION",
      required: true,
      isCustom: false,
      description: "Current semester or academic term code (e.g. SEM-5)",
      entityType: "STUDENT",
    },
    {
      key: "phone",
      label: "Phone / Mobile Number",
      type: "PHONE",
      required: false,
      isCustom: false,
      description: "Student contact mobile number",
      entityType: "STUDENT",
    },
    {
      key: "email",
      label: "Email Address",
      type: "EMAIL",
      required: false,
      isCustom: false,
      description: "Student email address",
      entityType: "STUDENT",
    },
  ],
};

// ─── Alias Dictionary (Spec §15) ─────────────────────────────────────────────

const DEFAULT_ALIAS_DICTIONARY: Record<string, Record<string, string[]>> = {
  STUDENT: {
    registerNumber: [
      "reg no",
      "reg_no",
      "regno",
      "reg.no",
      "reg #",
      "register no",
      "register number",
      "registration no",
      "registration number",
      "roll no",
      "roll_no",
      "rollno",
      "roll.no",
      "roll #",
      "roll number",
      "admission no",
      "admission number",
      "admission_no",
      "adm no",
      "adm_no",
      "adm.no",
      "adm number",
      "student id",
      "student_id",
      "studentid",
      "student code",
      "usn",
      "enrollment no",
      "enrollment number",
      "enrolment no",
      "enrolment number",
      "hall ticket no",
      "hall ticket number",
      "ht no",
      "htno",
      "matric no",
      "matric number",
      "index no",
      "urn",
    ],
    name: [
      "student name",
      "name of student",
      "name of the student",
      "full name",
      "fullname",
      "candidate name",
      "name of candidate",
      "applicant name",
      "student_name",
      "full_name",
      "candidate_name",
      "first name",
      "student full name",
      "name",
    ],
    dateOfBirth: [
      "dob",
      "d_o_b",
      "d.o.b",
      "d.o.b.",
      "date of birth",
      "birth date",
      "birth_date",
      "birthdate",
      "date_of_birth",
      "born date",
    ],
    department: [
      "dept",
      "department",
      "dept name",
      "department name",
      "branch",
      "branch name",
      "dept code",
      "department code",
      "branch code",
      "discipline",
      "stream",
      "dept_name",
      "department_name",
      "branch_name",
      "major",
    ],
    program: [
      "program",
      "programme",
      "course",
      "degree",
      "program name",
      "programme name",
      "program code",
      "programme code",
      "course name",
      "course code",
      "degree name",
      "degree code",
      "prog",
      "prog name",
      "program_name",
      "course_name",
      "degree_name",
    ],
    batch: [
      "batch",
      "batch year",
      "admission year",
      "year of admission",
      "batch name",
      "batch code",
      "joining year",
      "academic year",
      "batch_name",
      "batch_code",
      "admission_year",
      "class of",
      "passout year",
      "graduation year",
      "grad year",
    ],
    academicPeriod: [
      "semester",
      "sem",
      "current semester",
      "current sem",
      "term",
      "academic period",
      "period",
      "trimester",
      "year",
      "current year",
      "academic_period",
      "current_semester",
      "sem no",
      "sem_no",
      "current term",
    ],
    phone: [
      "phone",
      "mobile",
      "mobile no",
      "mobile number",
      "contact",
      "contact no",
      "contact number",
      "phone no",
      "phone number",
      "cell",
      "cell no",
      "cell number",
      "whatsapp",
      "whatsapp no",
      "whatsapp number",
      "student mobile",
      "student phone",
      "phone_number",
      "mobile_number",
      "contact_no",
      "tel",
      "telephone",
    ],
    email: [
      "email",
      "email address",
      "mail",
      "mail id",
      "email id",
      "student email",
      "college email",
      "personal email",
      "e-mail",
      "e-mail id",
      "e-mail address",
      "email_id",
      "email_address",
      "mail_id",
    ],
  },
};

// ─── Normalization Helpers ───────────────────────────────────────────────────

function cleanWhitespace(val: string): string {
  return val.replace(/\s+/g, " ").trim();
}

function toSnakeCase(val: string): string {
  return val
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .trim();
}

function normalizeSimple(val: string): string {
  return val.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ─── Canonical Fields Retrieval ──────────────────────────────────────────────

/**
 * Retrieves the full list of canonical fields for an entity type,
 * combining hardcoded core relational fields with dynamically configured custom fields.
 */
export async function getCanonicalFields(
  entityType: string
): Promise<CanonicalField[]> {
  const upperType = entityType.toUpperCase();
  const coreFields = CORE_CANONICAL_FIELDS[upperType] || [];

  // Fetch active custom fields for this entity
  const customFieldDefs = await listCustomFieldDefinitions(upperType, false);

  const customFields: CanonicalField[] = customFieldDefs.map((cf) => ({
    key: cf.name,
    label: cf.label,
    type: cf.type,
    required: cf.required,
    isCustom: true,
    description: cf.helpText ?? `Custom Field (${cf.type})`,
    entityType: upperType,
  }));

  return [...coreFields, ...customFields];
}

// ─── Auto-Suggestion Engine ──────────────────────────────────────────────────

/**
 * Matches a single source header against candidate canonical fields using
 * the 5-stage prioritized matching algorithm:
 * 1. Exact match (key or label)
 * 2. Case-insensitive match
 * 3. Trimmed / whitespace-normalized match
 * 4. Underscore / snake_case normalized match
 * 5. Alias dictionary lookup (spec §15)
 * 6. Fuzzy token match fallback
 */
export function matchSingleHeader(
  sourceHeader: string,
  canonicalFields: CanonicalField[],
  entityType: string
): ColumnMappingSuggestion {
  const raw = sourceHeader;
  const upperType = entityType.toUpperCase();
  const aliasDict = DEFAULT_ALIAS_DICTIONARY[upperType] || {};

  if (!raw || raw.trim().length === 0) {
    return {
      sourceHeader,
      suggestedKey: null,
      confidence: "NONE",
      matchReason: "NONE",
    };
  }

  // 1. Exact match (key or label)
  for (const field of canonicalFields) {
    if (raw === field.key || raw === field.label) {
      return {
        sourceHeader,
        suggestedKey: field.key,
        confidence: "HIGH",
        matchReason: "EXACT",
      };
    }
  }

  // 2. Case-insensitive match
  const lowerRaw = raw.toLowerCase();
  for (const field of canonicalFields) {
    if (
      lowerRaw === field.key.toLowerCase() ||
      lowerRaw === field.label.toLowerCase()
    ) {
      return {
        sourceHeader,
        suggestedKey: field.key,
        confidence: "HIGH",
        matchReason: "CASE_INSENSITIVE",
      };
    }
  }

  // 3. Trimmed / whitespace normalized match
  const cleanedRaw = cleanWhitespace(lowerRaw);
  for (const field of canonicalFields) {
    if (
      cleanedRaw === cleanWhitespace(field.key.toLowerCase()) ||
      cleanedRaw === cleanWhitespace(field.label.toLowerCase())
    ) {
      return {
        sourceHeader,
        suggestedKey: field.key,
        confidence: "HIGH",
        matchReason: "TRIMMED",
      };
    }
  }

  // 4. Underscore-normalized match (e.g. "Register_Number" or "register_number" -> "registerNumber")
  const normalizedRaw = toSnakeCase(raw);
  for (const field of canonicalFields) {
    if (
      normalizedRaw === toSnakeCase(field.key) ||
      normalizedRaw === toSnakeCase(field.label)
    ) {
      return {
        sourceHeader,
        suggestedKey: field.key,
        confidence: "HIGH",
        matchReason: "UNDERSCORE_NORMALIZED",
      };
    }
  }

  // 5. Alias Dictionary lookup (spec §15)
  const simpleRaw = normalizeSimple(raw);
  for (const field of canonicalFields) {
    const aliases = aliasDict[field.key] || [];

    // Also include custom field generated aliases
    if (field.isCustom) {
      const customAliases = [
        toSnakeCase(field.label),
        cleanWhitespace(field.label.toLowerCase()),
        normalizeSimple(field.label),
      ];
      aliases.push(...customAliases);
    }

    for (const alias of aliases) {
      const simpleAlias = normalizeSimple(alias);
      if (
        simpleRaw === simpleAlias ||
        cleanedRaw === alias.toLowerCase() ||
        normalizedRaw === toSnakeCase(alias)
      ) {
        return {
          sourceHeader,
          suggestedKey: field.key,
          confidence: "HIGH",
          matchReason: "ALIAS",
          matchedAlias: alias,
        };
      }
    }
  }

  // 6. Fuzzy Token Match Fallback
  const rawTokens = cleanedRaw.split(/[\s_-]+/);
  let bestFuzzyField: CanonicalField | null = null;
  let highestOverlap = 0;

  for (const field of canonicalFields) {
    const fieldTokens = cleanWhitespace(field.label.toLowerCase()).split(
      /[\s_-]+/
    );
    const overlap = rawTokens.filter((t) => fieldTokens.includes(t)).length;

    if (overlap > highestOverlap && overlap >= 1) {
      highestOverlap = overlap;
      bestFuzzyField = field;
    }
  }

  if (bestFuzzyField && highestOverlap >= 1) {
    return {
      sourceHeader,
      suggestedKey: bestFuzzyField.key,
      confidence: highestOverlap >= 2 ? "MEDIUM" : "LOW",
      matchReason: "FUZZY",
    };
  }

  return {
    sourceHeader,
    suggestedKey: null,
    confidence: "NONE",
    matchReason: "NONE",
  };
}

// ─── Template Header Overlap Scoring ─────────────────────────────────────────

/**
 * Calculates overlap score between a list of source headers and a saved template mapping.
 */
function calculateTemplateMatchScore(
  sourceHeaders: string[],
  templateMapping: Record<string, string>
): number {
  const templateKeys = Object.keys(templateMapping);
  if (templateKeys.length === 0 || sourceHeaders.length === 0) return 0;

  const normalizedSource = new Set(
    sourceHeaders.map((h) => normalizeSimple(h))
  );
  let matchCount = 0;

  for (const tKey of templateKeys) {
    if (normalizedSource.has(normalizeSimple(tKey))) {
      matchCount++;
    }
  }

  return matchCount / Math.max(templateKeys.length, sourceHeaders.length);
}

// ─── Column Mapping Suggestions ──────────────────────────────────────────────

/**
 * Generates column mapping suggestions for a list of spreadsheet headers.
 * Pre-fills from a saved template if specified or if a high-confidence template match is found.
 */
export async function suggestColumnMappings(
  sourceHeaders: string[],
  entityType: string,
  templateId?: string
): Promise<ColumnMappingResult> {
  const upperType = entityType.toUpperCase();
  const canonicalFields = await getCanonicalFields(upperType);
  const canonicalKeySet = new Set(canonicalFields.map((f) => f.key));

  let matchedTemplateInfo: {
    id: string;
    name: string;
    matchScore: number;
    mapping: Record<string, string>;
  } | null = null;

  // 1. Check if an explicit template was requested
  if (templateId) {
    const template = await repo.findImportMappingById(templateId);
    if (template && template.entityType === upperType) {
      matchedTemplateInfo = {
        id: template.id,
        name: template.name,
        matchScore: 1.0,
        mapping: template.mapping as Record<string, string>,
      };
    }
  } else {
    // 2. Find best matching saved template based on header overlap
    const savedTemplates = await repo.listImportMappings(upperType);
    let bestScore = 0;
    let bestTemplate: (typeof savedTemplates)[0] | null = null;

    for (const t of savedTemplates) {
      const score = calculateTemplateMatchScore(
        sourceHeaders,
        t.mapping as Record<string, string>
      );
      if (score > bestScore && score >= 0.6) {
        bestScore = score;
        bestTemplate = t;
      }
    }

    if (bestTemplate) {
      matchedTemplateInfo = {
        id: bestTemplate.id,
        name: bestTemplate.name,
        matchScore: bestScore,
        mapping: bestTemplate.mapping as Record<string, string>,
      };
    }
  }

  const suggestions: Record<string, ColumnMappingSuggestion> = {};
  const mappedKeys = new Set<string>();

  for (const header of sourceHeaders) {
    // If template has an entry for this header
    if (matchedTemplateInfo) {
      const templateTarget =
        matchedTemplateInfo.mapping[header] ||
        matchedTemplateInfo.mapping[cleanWhitespace(header)];

      if (templateTarget && canonicalKeySet.has(templateTarget)) {
        suggestions[header] = {
          sourceHeader: header,
          suggestedKey: templateTarget,
          confidence: "HIGH",
          matchReason: "TEMPLATE",
        };
        mappedKeys.add(templateTarget);
        continue;
      }
    }

    // Run auto-suggestion algorithm
    const suggestion = matchSingleHeader(header, canonicalFields, upperType);
    suggestions[header] = suggestion;

    if (suggestion.suggestedKey) {
      mappedKeys.add(suggestion.suggestedKey);
    }
  }

  // Identify unmapped required fields
  const unmappedRequiredKeys = canonicalFields
    .filter((f) => f.required && !mappedKeys.has(f.key))
    .map((f) => f.key);

  return {
    suggestions,
    canonicalFields,
    matchedTemplate: matchedTemplateInfo
      ? {
          id: matchedTemplateInfo.id,
          name: matchedTemplateInfo.name,
          matchScore: matchedTemplateInfo.matchScore,
        }
      : null,
    unmappedRequiredKeys,
  };
}

// ─── Data Row Transformation Helper ──────────────────────────────────────────

/**
 * Applies a confirmed column mapping to raw Excel rows,
 * transforming source column names into canonical field keys.
 */
export function applyColumnMapping(
  rawRows: ExcelRawRow[],
  mapping: Record<string, string>
): Array<Record<string, unknown>> {
  return rawRows.map((rawRow) => {
    const transformed: Record<string, unknown> = {
      __rowNumber: rawRow.__rowNumber,
    };

    for (const [sourceHeader, targetKey] of Object.entries(mapping)) {
      if (!targetKey || targetKey === "__ignore__") {
        continue;
      }

      const value = rawRow[sourceHeader];
      transformed[targetKey] = value !== undefined ? value : null;
    }

    return transformed;
  });
}

// ─── Mapping Templates CRUD ──────────────────────────────────────────────────

/**
 * Saves a confirmed column mapping as a reusable template.
 */
export async function saveMappingTemplateService(
  user: AuthUser | null,
  input: SaveMappingTemplateInput
): Promise<ImportMappingTemplate> {
  await authorize(user, PERMISSION_IMPORTS_MANAGE);

  const entityType = input.entityType.toUpperCase();
  const existing = await repo.findImportMappingByName(entityType, input.name);

  if (input.isDefault) {
    await repo.clearDefaultImportMappings(entityType);
  }

  let template;
  if (existing) {
    template = await repo.updateImportMapping(existing.id, {
      mapping: input.mapping,
      isDefault: input.isDefault ?? existing.isDefault,
      description: input.description ?? existing.description,
    });
  } else {
    template = await repo.createImportMapping({
      name: input.name,
      entityType,
      mapping: input.mapping,
      isDefault: input.isDefault ?? false,
      description: input.description,
    });
  }

  await logAudit({
    userId: user?.id,
    userEmail: user?.email,
    action: existing ? "UPDATE_IMPORT_MAPPING" : "CREATE_IMPORT_MAPPING",
    entity: "import_mappings",
    entityId: template.id,
    details: { name: template.name, entityType: template.entityType },
  });

  return {
    id: template.id,
    name: template.name,
    entityType: template.entityType,
    mapping: template.mapping as Record<string, string>,
    isDefault: template.isDefault,
    description: template.description,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

/**
 * Lists all mapping templates for an entity type.
 */
export async function listMappingTemplatesService(
  user: AuthUser | null,
  entityType: string
): Promise<ImportMappingTemplate[]> {
  await authorize(user, PERMISSION_IMPORTS_MANAGE);

  const templates = await repo.listImportMappings(entityType.toUpperCase());
  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    entityType: t.entityType,
    mapping: t.mapping as Record<string, string>,
    isDefault: t.isDefault,
    description: t.description,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}

/**
 * Gets a mapping template by ID.
 */
export async function getMappingTemplateService(
  user: AuthUser | null,
  id: string
): Promise<ImportMappingTemplate> {
  await authorize(user, PERMISSION_IMPORTS_MANAGE);

  const template = await repo.findImportMappingById(id);
  if (!template) {
    throw new NotFoundError(
      `Import mapping template with ID '${id}' not found.`
    );
  }

  return {
    id: template.id,
    name: template.name,
    entityType: template.entityType,
    mapping: template.mapping as Record<string, string>,
    isDefault: template.isDefault,
    description: template.description,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

/**
 * Deletes a mapping template by ID.
 */
export async function deleteMappingTemplateService(
  user: AuthUser | null,
  id: string
): Promise<{ success: boolean; id: string }> {
  await authorize(user, PERMISSION_IMPORTS_MANAGE);

  const existing = await repo.findImportMappingById(id);
  if (!existing) {
    throw new NotFoundError(
      `Import mapping template with ID '${id}' not found.`
    );
  }

  await repo.deleteImportMapping(id);

  await logAudit({
    userId: user?.id,
    userEmail: user?.email,
    action: "DELETE_IMPORT_MAPPING",
    entity: "import_mappings",
    entityId: id,
    details: { name: existing.name, entityType: existing.entityType },
  });

  return { success: true, id };
}
