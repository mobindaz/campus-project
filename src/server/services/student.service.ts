import { Prisma } from "@prisma/client";
import { authorize, AuthUser } from "@/server/authorization";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/server/errors/app-error";
import {
  buildStudentWhereInput,
  countStudentReferences,
  createStudent,
  deactivateStudent,
  deleteStudent,
  findStudentByEmail,
  findStudentByEmailExcludeId,
  findStudentById,
  findStudentByRegisterNumber,
  findStudentByRegisterNumberExcludeId,
  listStudents,
  listStudentsPaginated,
  StudentFilterParams,
  StudentWithRelations,
  updateStudent,
} from "@/server/repositories/student.repository";
import { findProgramById } from "@/server/repositories/program.repository";
import { findDepartmentById } from "@/server/repositories/department.repository";
import { findBatchById } from "@/server/repositories/batch.repository";
import { findAcademicPeriodById } from "@/server/repositories/academic-period.repository";
import { listCustomFieldDefinitions } from "@/server/repositories/custom-field.repository";
import {
  getUserRoles,
  getUserDepartmentScopes,
} from "@/server/services/rbac.service";
import { logAudit } from "@/server/services/audit.service";
import {
  buildPaginatedQuery,
  buildCsvExport,
} from "@/server/services/data-table.service";
import type {
  DataTableColumnDef,
  DataTableConfig,
} from "@/components/tables/data-table.types";
import {
  createStudentSchema,
  CreateStudentInput,
  studentFilterSchema,
  StudentFilterInput,
  updateStudentSchema,
  UpdateStudentInput,
} from "@/modules/students/schemas";
import { prisma } from "@/server/database";

const GLOBAL_SCOPE_ROLE_CODES = new Set(["college_admin", "principal"]);

/**
 * Resolves allowed department IDs for a user based on RBAC and department scopes.
 * Returns null if user has global access (unrestricted).
 * Returns array of department IDs (could be empty) if user is department-scoped.
 */
export async function resolveUserDepartmentScope(
  userId: string
): Promise<string[] | null> {
  const [roles, scopes] = await Promise.all([
    getUserRoles(userId),
    getUserDepartmentScopes(userId),
  ]);

  const isGlobal = roles.some((r) => GLOBAL_SCOPE_ROLE_CODES.has(r.code));
  if (isGlobal) {
    return null; // Global access: can see all departments
  }

  return scopes.map((s) => s.id);
}

/**
 * Validates custom field values against active CustomFieldDefinitions for the entity.
 */
export async function validateStudentCustomFields(
  customFields: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const definitions = await listCustomFieldDefinitions("STUDENT", false);
  const validated: Record<string, unknown> = {};

  for (const def of definitions) {
    const val = customFields[def.name];

    if (def.required && (val === undefined || val === null || val === "")) {
      throw new ValidationError(`Custom field '${def.label}' is required.`, {
        field: def.name,
      });
    }

    if (val !== undefined && val !== null && val !== "") {
      switch (def.type) {
        case "NUMBER": {
          const num = Number(val);
          if (isNaN(num)) {
            throw new ValidationError(
              `Field '${def.label}' must be a valid number.`
            );
          }
          validated[def.name] = num;
          break;
        }
        case "DECIMAL":
        case "CURRENCY": {
          const num = Number(val);
          if (isNaN(num)) {
            throw new ValidationError(
              `Field '${def.label}' must be a valid number.`
            );
          }
          validated[def.name] = num;
          break;
        }
        case "CHECKBOX": {
          validated[def.name] = Boolean(val);
          break;
        }
        case "MULTI_SELECT": {
          if (!Array.isArray(val)) {
            throw new ValidationError(
              `Field '${def.label}' must be an array of values.`
            );
          }
          validated[def.name] = val;
          break;
        }
        case "DATE":
        case "DATETIME": {
          const d = new Date(val as string);
          if (isNaN(d.getTime())) {
            throw new ValidationError(
              `Field '${def.label}' must be a valid date.`
            );
          }
          validated[def.name] = d.toISOString();
          break;
        }
        default:
          validated[def.name] = val;
      }
    } else if (val !== undefined) {
      validated[def.name] = val;
    }
  }

  // Preserve any other custom fields that may be set
  for (const [key, value] of Object.entries(customFields)) {
    if (validated[key] === undefined) {
      validated[key] = value;
    }
  }

  return validated;
}

/**
 * Lists all students matching filter criteria, automatically scoped by user department permissions.
 */
export async function listStudentsService(
  user: AuthUser | null | undefined,
  filters?: StudentFilterInput
) {
  const authResult = await authorize(user, "students.read");
  const validatedFilters = studentFilterSchema.parse(filters || {});

  const allowedDeptIds = await resolveUserDepartmentScope(authResult.userId);

  // If user is department-scoped
  if (allowedDeptIds !== null) {
    if (allowedDeptIds.length === 0) {
      return []; // Department-scoped user with no assigned departments sees no students
    }

    if (validatedFilters.departmentId) {
      const requestedIds = Array.isArray(validatedFilters.departmentId)
        ? validatedFilters.departmentId
        : [validatedFilters.departmentId];

      const hasUnauthorizedDept = requestedIds.some(
        (id) => !allowedDeptIds.includes(id)
      );

      if (hasUnauthorizedDept) {
        throw new ForbiddenError(
          "Permission denied: You cannot view students outside your assigned department scope."
        );
      }
    } else {
      // Automatically constrain filter to user's assigned departments
      validatedFilters.departmentId = allowedDeptIds;
    }
  }

  const where = buildStudentWhereInput(validatedFilters as StudentFilterParams);
  return listStudents(where);
}

/**
 * Lists students with server-side pagination, sorting, search, and department scope filtering.
 * Consumed by the DataTable component.
 */
export async function listStudentsPaginatedService(
  user: AuthUser | null | undefined,
  config: DataTableConfig
) {
  const authResult = await authorize(user, "students.read");
  const allowedDeptIds = await resolveUserDepartmentScope(authResult.userId);

  const filterParams: StudentFilterParams = {
    search: config.search,
    isActive:
      config.filters?.isActive !== undefined && config.filters.isActive !== ""
        ? config.filters.isActive === "true"
        : undefined,
    programId: config.filters?.programId || undefined,
    departmentId: config.filters?.departmentId || undefined,
    batchId: config.filters?.batchId || undefined,
    academicPeriodId: config.filters?.academicPeriodId || undefined,
  };

  // Enforce department scope
  if (allowedDeptIds !== null) {
    if (allowedDeptIds.length === 0) {
      return {
        data: [],
        total: 0,
        page: config.page,
        pageSize: config.pageSize,
        totalPages: 0,
      };
    }

    if (filterParams.departmentId) {
      const requestedIds = Array.isArray(filterParams.departmentId)
        ? filterParams.departmentId
        : [filterParams.departmentId];

      const unauthorized = requestedIds.some(
        (id) => !allowedDeptIds.includes(id)
      );
      if (unauthorized) {
        throw new ForbiddenError(
          "Permission denied: You cannot view students outside your assigned department scope."
        );
      }
    } else {
      filterParams.departmentId = allowedDeptIds;
    }
  }

  const { skip, take, orderBy } = buildPaginatedQuery(config);
  const where = buildStudentWhereInput(filterParams);

  const { data, total } = await listStudentsPaginated({
    skip,
    take,
    where,
    orderBy: orderBy as Prisma.StudentOrderByWithRelationInput | undefined,
  });

  const totalPages = Math.ceil(total / take);

  return {
    data,
    total,
    page: config.page,
    pageSize: take,
    totalPages,
  };
}

/**
 * Retrieves a single student by ID with full relations and department authorization check.
 */
export async function getStudentByIdService(
  user: AuthUser | null | undefined,
  id: string
) {
  await authorize(user, "students.read");

  if (!id || typeof id !== "string") {
    throw new ValidationError("Student ID is required.");
  }

  const student = await findStudentById(id);
  if (!student) {
    throw new NotFoundError(`Student with ID '${id}' not found.`);
  }

  // Check department scope for this specific student
  if (student.departmentId) {
    await authorize(user, "students.read", {
      departmentId: student.departmentId,
    });
  }

  return student;
}

/**
 * Creates a new student record after strict validation, uniqueness check, and audit logging.
 */
export async function createStudentService(
  user: AuthUser | null | undefined,
  input: CreateStudentInput
) {
  const parsed = createStudentSchema.parse(input);

  // Authorize creation in target department
  const authResult = await authorize(user, "students.create", {
    departmentId: parsed.departmentId || undefined,
  });

  // Verify unique registerNumber
  const regNumberClean = parsed.registerNumber.trim();
  const existingReg = await findStudentByRegisterNumber(regNumberClean);
  if (existingReg) {
    throw new ValidationError(
      `A student with Register Number '${regNumberClean}' already exists.`,
      { field: "registerNumber" }
    );
  }

  // Verify unique email if provided
  if (parsed.email) {
    const emailClean = parsed.email.trim().toLowerCase();
    const existingEmail = await findStudentByEmail(emailClean);
    if (existingEmail) {
      throw new ValidationError(
        `A student with Email '${emailClean}' already exists.`,
        { field: "email" }
      );
    }
  }

  // Verify program exists
  const program = await findProgramById(parsed.programId);
  if (!program) {
    throw new NotFoundError(
      `Degree program with ID '${parsed.programId}' not found.`
    );
  }

  // Verify department exists if specified
  if (parsed.departmentId) {
    const department = await findDepartmentById(parsed.departmentId);
    if (!department) {
      throw new NotFoundError(
        `Department with ID '${parsed.departmentId}' not found.`
      );
    }
  }

  // Verify batch exists
  const batch = await findBatchById(parsed.batchId);
  if (!batch) {
    throw new NotFoundError(`Batch with ID '${parsed.batchId}' not found.`);
  }

  // Verify academic period exists
  const academicPeriod = await findAcademicPeriodById(parsed.academicPeriodId);
  if (!academicPeriod) {
    throw new NotFoundError(
      `Academic Period with ID '${parsed.academicPeriodId}' not found.`
    );
  }

  // Validate custom fields
  const validatedCustomFields = await validateStudentCustomFields(
    parsed.customFields || {}
  );

  // Create student
  const student = await createStudent({
    registerNumber: regNumberClean,
    name: parsed.name.trim(),
    email: parsed.email ? parsed.email.trim().toLowerCase() : null,
    phone: parsed.phone ? parsed.phone.trim() : null,
    dateOfBirth: parsed.dateOfBirth,
    program: { connect: { id: parsed.programId } },
    ...(parsed.departmentId
      ? { department: { connect: { id: parsed.departmentId } } }
      : {}),
    batch: { connect: { id: parsed.batchId } },
    academicPeriod: { connect: { id: parsed.academicPeriodId } },
    isActive: parsed.isActive !== undefined ? parsed.isActive : true,
    customFields: validatedCustomFields as Prisma.InputJsonValue,
  });

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "STUDENT_CREATE",
    entity: "Student",
    entityId: student.id,
    details: {
      registerNumber: student.registerNumber,
      name: student.name,
      departmentId: student.departmentId,
      programId: student.programId,
      batchId: student.batchId,
      academicPeriodId: student.academicPeriodId,
    },
  });

  return student;
}

/**
 * Updates an existing student record after authorization, validation, and audit logging.
 */
export async function updateStudentService(
  user: AuthUser | null | undefined,
  id: string,
  input: UpdateStudentInput
) {
  if (!id || typeof id !== "string") {
    throw new ValidationError("Student ID is required.");
  }

  const existingStudent = await findStudentById(id);
  if (!existingStudent) {
    throw new NotFoundError(`Student with ID '${id}' not found.`);
  }

  // Authorize update on the existing student's department
  const authResult = await authorize(user, "students.update", {
    departmentId: existingStudent.departmentId || undefined,
  });

  const parsed = updateStudentSchema.parse(input);

  // If changing department, re-check authorization on the target department
  if (
    parsed.departmentId !== undefined &&
    parsed.departmentId !== existingStudent.departmentId
  ) {
    await authorize(user, "students.update", {
      departmentId: parsed.departmentId || undefined,
    });
  }

  // Uniqueness check for registerNumber if modified
  let regNumberClean: string | undefined = undefined;
  if (
    parsed.registerNumber &&
    parsed.registerNumber !== existingStudent.registerNumber
  ) {
    regNumberClean = parsed.registerNumber.trim();
    const duplicate = await findStudentByRegisterNumberExcludeId(
      regNumberClean,
      id
    );
    if (duplicate) {
      throw new ValidationError(
        `A student with Register Number '${regNumberClean}' already exists.`,
        { field: "registerNumber" }
      );
    }
  }

  // Uniqueness check for email if modified
  let emailClean: string | null | undefined = undefined;
  if (parsed.email !== undefined && parsed.email !== existingStudent.email) {
    if (parsed.email) {
      emailClean = parsed.email.trim().toLowerCase();
      const duplicate = await findStudentByEmailExcludeId(emailClean, id);
      if (duplicate) {
        throw new ValidationError(
          `A student with Email '${emailClean}' already exists.`,
          { field: "email" }
        );
      }
    } else {
      emailClean = null;
    }
  }

  // Validate relations if modified
  if (parsed.programId && parsed.programId !== existingStudent.programId) {
    const program = await findProgramById(parsed.programId);
    if (!program) {
      throw new NotFoundError(
        `Degree program with ID '${parsed.programId}' not found.`
      );
    }
  }

  if (
    parsed.departmentId !== undefined &&
    parsed.departmentId !== existingStudent.departmentId
  ) {
    if (parsed.departmentId) {
      const department = await findDepartmentById(parsed.departmentId);
      if (!department) {
        throw new NotFoundError(
          `Department with ID '${parsed.departmentId}' not found.`
        );
      }
    }
  }

  if (parsed.batchId && parsed.batchId !== existingStudent.batchId) {
    const batch = await findBatchById(parsed.batchId);
    if (!batch) {
      throw new NotFoundError(`Batch with ID '${parsed.batchId}' not found.`);
    }
  }

  if (
    parsed.academicPeriodId &&
    parsed.academicPeriodId !== existingStudent.academicPeriodId
  ) {
    const academicPeriod = await findAcademicPeriodById(
      parsed.academicPeriodId
    );
    if (!academicPeriod) {
      throw new NotFoundError(
        `Academic Period with ID '${parsed.academicPeriodId}' not found.`
      );
    }
  }

  // Handle custom fields merge & validation
  let mergedCustomFields: Record<string, unknown> | undefined = undefined;
  if (parsed.customFields !== undefined) {
    const existingCustom =
      typeof existingStudent.customFields === "object" &&
      existingStudent.customFields !== null
        ? (existingStudent.customFields as Record<string, unknown>)
        : {};

    const combined = { ...existingCustom, ...(parsed.customFields || {}) };
    mergedCustomFields = await validateStudentCustomFields(combined);
  }

  const updateData: Prisma.StudentUpdateInput = {};
  if (regNumberClean !== undefined) updateData.registerNumber = regNumberClean;
  if (parsed.name !== undefined) updateData.name = parsed.name.trim();
  if (emailClean !== undefined) updateData.email = emailClean;
  if (parsed.phone !== undefined)
    updateData.phone = parsed.phone ? parsed.phone.trim() : null;
  if (parsed.dateOfBirth !== undefined)
    updateData.dateOfBirth = parsed.dateOfBirth;
  if (parsed.programId)
    updateData.program = { connect: { id: parsed.programId } };
  if (parsed.departmentId !== undefined) {
    if (parsed.departmentId) {
      updateData.department = { connect: { id: parsed.departmentId } };
    } else {
      updateData.department = { disconnect: true };
    }
  }
  if (parsed.batchId) updateData.batch = { connect: { id: parsed.batchId } };
  if (parsed.academicPeriodId)
    updateData.academicPeriod = { connect: { id: parsed.academicPeriodId } };
  if (parsed.isActive !== undefined) updateData.isActive = parsed.isActive;
  if (mergedCustomFields !== undefined)
    updateData.customFields = mergedCustomFields as Prisma.InputJsonValue;

  const updated = await updateStudent(id, updateData);

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "STUDENT_UPDATE",
    entity: "Student",
    entityId: id,
    details: {
      previous: {
        name: existingStudent.name,
        registerNumber: existingStudent.registerNumber,
        departmentId: existingStudent.departmentId,
      },
      updated: {
        name: updated.name,
        registerNumber: updated.registerNumber,
        departmentId: updated.departmentId,
      },
    },
  });

  return updated;
}

/**
 * Toggles a student's active status.
 */
export async function toggleStudentStatusService(
  user: AuthUser | null | undefined,
  id: string,
  isActive: boolean
) {
  if (!id || typeof id !== "string") {
    throw new ValidationError("Student ID is required.");
  }

  const existingStudent = await findStudentById(id);
  if (!existingStudent) {
    throw new NotFoundError(`Student with ID '${id}' not found.`);
  }

  const authResult = await authorize(user, "students.update", {
    departmentId: existingStudent.departmentId || undefined,
  });

  const updated = await updateStudent(id, { isActive });

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "STUDENT_TOGGLE_STATUS",
    entity: "Student",
    entityId: id,
    details: {
      previousStatus: existingStudent.isActive,
      newStatus: isActive,
    },
  });

  return updated;
}

/**
 * Deletes or deactivates a student depending on whether foreign key references exist (Correction #8).
 */
export async function deleteStudentService(
  user: AuthUser | null | undefined,
  id: string
) {
  if (!id || typeof id !== "string") {
    throw new ValidationError("Student ID is required.");
  }

  const existingStudent = await findStudentById(id);
  if (!existingStudent) {
    throw new NotFoundError(`Student with ID '${id}' not found.`);
  }

  const authResult = await authorize(user, "students.delete", {
    departmentId: existingStudent.departmentId || undefined,
  });

  const refCount = await countStudentReferences(id);

  if (refCount > 0) {
    const deactivated = await deactivateStudent(id);

    await logAudit({
      userId: authResult.userId,
      userEmail: user?.email,
      action: "STUDENT_FORCE_DEACTIVATE_DUE_TO_REFERENCES",
      entity: "Student",
      entityId: id,
      details: {
        name: existingStudent.name,
        registerNumber: existingStudent.registerNumber,
        referenceCount: refCount,
      },
    });

    return {
      student: deactivated,
      mode: "DEACTIVATED" as const,
      message: `Student has ${refCount} active placement/clearance reference(s). Record was deactivated to maintain data integrity.`,
    };
  }

  await deleteStudent(id);

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "STUDENT_DELETE",
    entity: "Student",
    entityId: id,
    details: {
      name: existingStudent.name,
      registerNumber: existingStudent.registerNumber,
      departmentId: existingStudent.departmentId,
    },
  });

  return {
    student: existingStudent,
    mode: "DELETED" as const,
    message: "Student record permanently deleted.",
  };
}

export const STUDENT_EXPORT_COLUMNS: DataTableColumnDef<StudentWithRelations>[] =
  [
    {
      id: "registerNumber",
      header: "Register Number",
      exportAccessor: (row) => row.registerNumber,
    },
    { id: "name", header: "Student Name", exportAccessor: (row) => row.name },
    {
      id: "email",
      header: "Email Address",
      exportAccessor: (row) => row.email ?? "",
    },
    {
      id: "phone",
      header: "Phone Number",
      exportAccessor: (row) => row.phone ?? "",
    },
    {
      id: "program",
      header: "Program",
      exportAccessor: (row) => row.program?.name ?? "",
    },
    {
      id: "department",
      header: "Department",
      exportAccessor: (row) => row.department?.name ?? "",
    },
    {
      id: "batch",
      header: "Batch",
      exportAccessor: (row) => row.batch?.name ?? "",
    },
    {
      id: "academicPeriod",
      header: "Academic Period",
      exportAccessor: (row) => row.academicPeriod?.name ?? "",
    },
    {
      id: "status",
      header: "Status",
      exportAccessor: (row) => (row.isActive ? "Active" : "Inactive"),
    },
  ];

/**
 * Exports filtered students to CSV string format.
 */
export async function exportStudentsCsvService(
  user: AuthUser | null | undefined,
  config: DataTableConfig,
  columns?: DataTableColumnDef<StudentWithRelations>[],
  userPermissions?: string[]
): Promise<string> {
  const authResult = await authorize(user, "students.read");
  const allowedDeptIds = await resolveUserDepartmentScope(authResult.userId);

  const filterParams: StudentFilterParams = {
    search: config.search,
    isActive:
      config.filters?.isActive !== undefined && config.filters.isActive !== ""
        ? config.filters.isActive === "true"
        : undefined,
    programId: config.filters?.programId || undefined,
    departmentId: config.filters?.departmentId || undefined,
    batchId: config.filters?.batchId || undefined,
    academicPeriodId: config.filters?.academicPeriodId || undefined,
  };

  if (allowedDeptIds !== null) {
    if (allowedDeptIds.length === 0) return "";
    filterParams.departmentId = allowedDeptIds;
  }

  const where = buildStudentWhereInput(filterParams);
  const rows = await listStudents(where, { registerNumber: "asc" });

  const exportCols = columns || STUDENT_EXPORT_COLUMNS;
  const perms = userPermissions || authResult.permissions;

  return buildCsvExport(
    rows,
    exportCols,
    config.visibleColumns && config.visibleColumns.length > 0
      ? config.visibleColumns
      : exportCols.map((c) => c.id),
    perms
  );
}

/**
 * Retrieves recent audit logs for a student profile.
 */
export async function getStudentAuditLogsService(
  user: AuthUser | null | undefined,
  studentId: string
) {
  await authorize(user, "students.read");

  const student = await findStudentById(studentId);
  if (!student) {
    throw new NotFoundError(`Student with ID '${studentId}' not found.`);
  }

  if (student.departmentId) {
    await authorize(user, "students.read", {
      departmentId: student.departmentId,
    });
  }

  return prisma.auditLog.findMany({
    where: {
      entity: "Student",
      entityId: studentId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });
}
