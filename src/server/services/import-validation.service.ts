/**
 * Row-Level Import Validation Service
 * =====================================
 * Spec §19: Implements row-level validation for Student imports.
 * - Required fields check (registerNumber, name, program, batch, academicPeriod).
 * - Data types & formatting (RFC email, normalized phone, robust date parsing).
 * - In-file and database duplicate detection.
 * - Relational foreign key verification against active departments/programs/batches/periods.
 * - Custom fields schema validation.
 */

import { listDepartments } from "@/server/repositories/department.repository";
import { listPrograms } from "@/server/repositories/program.repository";
import { listBatches } from "@/server/repositories/batch.repository";
import { listAcademicPeriods } from "@/server/repositories/academic-period.repository";
import { listCustomFieldDefinitions } from "@/server/repositories/custom-field.repository";
import {
  findStudentsByRegisterNumbers,
  findStudentsByEmails,
} from "@/server/repositories/student.repository";
import type {
  ImportValidationResult,
  ImportValidationSummary,
  MatchingStrategy,
  RowImportAction,
  RowValidationError,
  RowValidationResult,
  RowValidationStatus,
} from "@/modules/excel-import/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Parses arbitrary date formats including ISO strings, DD/MM/YYYY, MM/DD/YYYY, and Excel serial days.
 */
export function parseDateValue(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  // Excel serial date number (e.g. 38125 -> 2004-05-18)
  if (typeof value === "number" && value > 0 && value < 100000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    if (!isNaN(date.getTime())) return date;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // ISO format or native Date.parseable (YYYY-MM-DD, etc.)
    const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      const date = new Date(Date.UTC(year, month, day));
      if (!isNaN(date.getTime())) return date;
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const date = new Date(Date.UTC(year, month, day));
      if (!isNaN(date.getTime())) return date;
    }

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

/**
 * Validates phone numbers (allows digits, plus, hyphens, parentheses).
 */
export function isValidPhoneNumber(phone: string): boolean {
  const digitsOnly = phone.replace(/\D/g, "");
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
}

// ─── Core Student Row Validation ─────────────────────────────────────────────

export async function validateStudentImportRows(
  rows: Array<Record<string, unknown>>,
  matchingStrategy: MatchingStrategy = "registerNumber"
): Promise<ImportValidationResult> {
  // 1. Fetch reference entities in parallel
  const [departments, programs, batches, academicPeriods, customFieldDefs] =
    await Promise.all([
      listDepartments({ includeInactive: false }),
      listPrograms({ includeInactive: false }),
      listBatches({ includeInactive: false }),
      listAcademicPeriods({ includeInactive: false }),
      listCustomFieldDefinitions("STUDENT", false),
    ]);

  const departmentMap = new Map(departments.map((d) => [d.id, d]));
  const programMap = new Map(programs.map((p) => [p.id, p]));
  const batchMap = new Map(batches.map((b) => [b.id, b]));
  const periodMap = new Map(academicPeriods.map((ap) => [ap.id, ap]));

  // 2. Pre-fetch existing students to match create vs update
  const regNosToQuery: string[] = [];
  const emailsToQuery: string[] = [];

  for (const row of rows) {
    if (row.registerNumber) {
      regNosToQuery.push(String(row.registerNumber).trim());
    }
    if (row.email) {
      emailsToQuery.push(String(row.email).trim().toLowerCase());
    }
  }

  const [existingByRegNoList, existingByEmailList] = await Promise.all([
    findStudentsByRegisterNumbers(regNosToQuery),
    findStudentsByEmails(emailsToQuery),
  ]);

  const existingByRegNoMap = new Map(
    existingByRegNoList.map((s) => [s.registerNumber.toLowerCase(), s])
  );
  const existingByEmailMap = new Map(
    existingByEmailList
      .filter((s) => s.email)
      .map((s) => [s.email!.toLowerCase(), s])
  );

  // 3. Tracking in-file duplicates
  const seenRegisterNumbers = new Map<string, number>();
  const seenEmails = new Map<string, number>();

  const validatedRows: RowValidationResult[] = [];

  let validCount = 0;
  let warningCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;
  let createCount = 0;
  let updateCount = 0;

  for (let idx = 0; idx < rows.length; idx++) {
    const rawRow = rows[idx];
    const rowNumber = idx + 2; // Spreadsheet row index (header is row 1)
    const errors: RowValidationError[] = [];
    const warnings: RowValidationError[] = [];
    const cleanData: Record<string, unknown> = { ...rawRow };
    const customFieldsObj: Record<string, unknown> = {};

    let isDuplicate = false;

    // --- Validate Register Number (Primary Matching Key) ---
    const rawRegNo = rawRow.registerNumber;
    if (
      rawRegNo === null ||
      rawRegNo === undefined ||
      String(rawRegNo).trim() === ""
    ) {
      errors.push({
        field: "registerNumber",
        message: "Register Number is required.",
      });
    } else {
      const regNoStr = String(rawRegNo).trim();
      cleanData.registerNumber = regNoStr;
      const lowerRegNo = regNoStr.toLowerCase();

      if (seenRegisterNumbers.has(lowerRegNo)) {
        isDuplicate = true;
        errors.push({
          field: "registerNumber",
          message: `Duplicate Register Number in spreadsheet (already seen on row ${seenRegisterNumbers.get(
            lowerRegNo
          )}).`,
        });
      } else {
        seenRegisterNumbers.set(lowerRegNo, rowNumber);
      }
    }

    // --- Validate Student Name ---
    const rawName = rawRow.name;
    if (
      rawName === null ||
      rawName === undefined ||
      String(rawName).trim() === ""
    ) {
      errors.push({
        field: "name",
        message: "Student Name is required.",
      });
    } else {
      cleanData.name = String(rawName).trim();
    }

    // --- Validate Email ---
    const rawEmail = rawRow.email;
    if (
      rawEmail !== null &&
      rawEmail !== undefined &&
      String(rawEmail).trim() !== ""
    ) {
      const emailStr = String(rawEmail).trim().toLowerCase();
      if (!EMAIL_REGEX.test(emailStr)) {
        errors.push({
          field: "email",
          message: `Invalid email address format: "${emailStr}".`,
        });
      } else {
        cleanData.email = emailStr;

        if (seenEmails.has(emailStr)) {
          isDuplicate = true;
          errors.push({
            field: "email",
            message: `Duplicate Email in spreadsheet (already seen on row ${seenEmails.get(
              emailStr
            )}).`,
          });
        } else {
          seenEmails.set(emailStr, rowNumber);
        }
      }
    } else {
      cleanData.email = null;
    }

    // --- Validate Phone ---
    const rawPhone = rawRow.phone;
    if (
      rawPhone !== null &&
      rawPhone !== undefined &&
      String(rawPhone).trim() !== ""
    ) {
      const phoneStr = String(rawPhone).trim();
      if (!isValidPhoneNumber(phoneStr)) {
        warnings.push({
          field: "phone",
          message: `Phone number "${phoneStr}" may have unusual formatting.`,
          isWarning: true,
        });
      }
      cleanData.phone = phoneStr;
    } else {
      cleanData.phone = null;
    }

    // --- Validate Date of Birth ---
    const rawDob = rawRow.dateOfBirth;
    if (
      rawDob !== null &&
      rawDob !== undefined &&
      String(rawDob).trim() !== ""
    ) {
      const parsedDate = parseDateValue(rawDob);
      if (!parsedDate) {
        errors.push({
          field: "dateOfBirth",
          message: `Invalid Date of Birth: "${rawDob}". Expected YYYY-MM-DD or DD/MM/YYYY.`,
        });
      } else {
        cleanData.dateOfBirth = parsedDate;
      }
    } else {
      cleanData.dateOfBirth = null;
    }

    // --- Validate Program Relational ID ---
    const rawProg = rawRow.programId || rawRow.program;
    if (!rawProg || String(rawProg).trim() === "") {
      errors.push({
        field: "programId",
        message: "Program is required.",
      });
    } else {
      const progId = String(rawProg).trim();
      if (!programMap.has(progId)) {
        errors.push({
          field: "programId",
          message: `Unknown Program ID or unmapped value "${progId}".`,
        });
      } else {
        cleanData.programId = progId;
      }
    }

    // --- Validate Batch Relational ID ---
    const rawBatch = rawRow.batchId || rawRow.batch;
    if (!rawBatch || String(rawBatch).trim() === "") {
      errors.push({
        field: "batchId",
        message: "Batch is required.",
      });
    } else {
      const batchId = String(rawBatch).trim();
      if (!batchMap.has(batchId)) {
        errors.push({
          field: "batchId",
          message: `Unknown Batch ID or unmapped value "${batchId}".`,
        });
      } else {
        cleanData.batchId = batchId;
      }
    }

    // --- Validate Academic Period Relational ID ---
    const rawPeriod = rawRow.academicPeriodId || rawRow.academicPeriod;
    if (!rawPeriod || String(rawPeriod).trim() === "") {
      errors.push({
        field: "academicPeriodId",
        message: "Academic Period is required.",
      });
    } else {
      const periodId = String(rawPeriod).trim();
      if (!periodMap.has(periodId)) {
        errors.push({
          field: "academicPeriodId",
          message: `Unknown Academic Period ID or unmapped value "${periodId}".`,
        });
      } else {
        cleanData.academicPeriodId = periodId;
      }
    }

    // --- Validate Department Relational ID (Optional) ---
    const rawDept = rawRow.departmentId || rawRow.department;
    if (rawDept && String(rawDept).trim() !== "") {
      const deptId = String(rawDept).trim();
      if (!departmentMap.has(deptId)) {
        errors.push({
          field: "departmentId",
          message: `Unknown Department ID or unmapped value "${deptId}".`,
        });
      } else {
        cleanData.departmentId = deptId;
      }
    } else {
      cleanData.departmentId = null;
    }

    // --- Validate Custom Fields ---
    for (const cf of customFieldDefs) {
      const rawVal = rawRow[cf.name];

      if (
        cf.required &&
        (rawVal === null ||
          rawVal === undefined ||
          String(rawVal).trim() === "")
      ) {
        errors.push({
          field: cf.name,
          message: `${cf.label} is a required custom field.`,
        });
        continue;
      }

      if (
        rawVal !== null &&
        rawVal !== undefined &&
        String(rawVal).trim() !== ""
      ) {
        const valStr = String(rawVal).trim();

        if (cf.type === "NUMBER" || cf.type === "DECIMAL") {
          const num = Number(valStr);
          if (isNaN(num)) {
            errors.push({
              field: cf.name,
              message: `${cf.label} must be a valid number.`,
            });
          } else {
            customFieldsObj[cf.name] = num;
          }
        } else if (cf.type === "DATE" || cf.type === "DATETIME") {
          const parsed = parseDateValue(rawVal);
          if (!parsed) {
            errors.push({
              field: cf.name,
              message: `${cf.label} must be a valid date.`,
            });
          } else {
            customFieldsObj[cf.name] = parsed.toISOString();
          }
        } else if (cf.type === "DROPDOWN" || cf.type === "RADIO") {
          if (Array.isArray(cf.options)) {
            const validOptions = cf.options.map((opt) =>
              typeof opt === "string"
                ? opt
                : (opt as Record<string, unknown>).value ||
                  (opt as Record<string, unknown>).label
            );
            if (
              !validOptions.some(
                (opt) => String(opt).toLowerCase() === valStr.toLowerCase()
              )
            ) {
              errors.push({
                field: cf.name,
                message: `Value "${valStr}" is not a valid option for ${cf.label}.`,
              });
            } else {
              customFieldsObj[cf.name] = valStr;
            }
          } else {
            customFieldsObj[cf.name] = valStr;
          }
        } else {
          customFieldsObj[cf.name] = valStr;
        }
      }
    }

    cleanData.customFields = customFieldsObj;

    // --- Determine Row Action and Status ---
    let action: RowImportAction = "CREATE";
    let status: RowValidationStatus = "VALID";

    if (errors.length > 0) {
      action = "SKIP";
      status = isDuplicate ? "DUPLICATE" : "ERROR";
      if (isDuplicate) {
        duplicateCount++;
      } else {
        errorCount++;
      }
    } else {
      if (warnings.length > 0) {
        status = "WARNING";
        warningCount++;
      } else {
        validCount++;
      }

      // Check if updating existing record
      let existingRecord = null;
      if (matchingStrategy === "email" && cleanData.email) {
        existingRecord = existingByEmailMap.get(
          String(cleanData.email).toLowerCase()
        );
      } else if (cleanData.registerNumber) {
        existingRecord = existingByRegNoMap.get(
          String(cleanData.registerNumber).toLowerCase()
        );
      }

      if (existingRecord) {
        action = "UPDATE";
        updateCount++;
      } else {
        action = "CREATE";
        createCount++;
      }
    }

    validatedRows.push({
      rowNumber,
      status,
      action,
      errors,
      warnings,
      data: cleanData,
      originalData: rawRow,
    });
  }

  const totalRows = rows.length;
  const summary: ImportValidationSummary = {
    totalRows,
    validRows: validCount + warningCount,
    warningRows: warningCount,
    errorRows: errorCount,
    duplicateRows: duplicateCount,
    createCount,
    updateCount,
    canProceed: validCount + warningCount > 0,
  };

  return {
    summary,
    rows: validatedRows,
  };
}
