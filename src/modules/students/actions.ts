"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/server/services/auth.service";
import { AppError } from "@/server/errors/app-error";
import {
  createStudentService,
  deleteStudentService,
  exportStudentsCsvService,
  getStudentAuditLogsService,
  getStudentByIdService,
  listStudentsPaginatedService,
  resolveUserDepartmentScope,
  toggleStudentStatusService,
  updateStudentService,
} from "@/server/services/student.service";
import {
  CreateStudentInput,
  UpdateStudentInput,
} from "@/modules/students/schemas";
import type {
  DataTableColumnDef,
  DataTableConfig,
} from "@/components/tables/data-table.types";
import type { StudentWithRelations } from "@/server/repositories/student.repository";
import type { StudentWithRelationsDto } from "@/modules/students/types";
import { listProgramsService } from "@/server/services/program.service";
import { listDepartmentsService } from "@/server/services/department.service";
import { listBatchesService } from "@/server/services/batch.service";
import { listAllAcademicPeriodsService } from "@/server/services/academic-period.service";
import { listCustomFieldDefinitionsService } from "@/server/services/custom-field.service";

export async function listStudentsPaginatedAction(config: DataTableConfig) {
  try {
    const session = await getSession();
    const result = await listStudentsPaginatedService(
      session?.user ?? null,
      config
    );
    return { success: true, data: result };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return {
      success: false,
      error: "An unexpected error occurred while fetching students.",
    };
  }
}

export async function getStudentByIdAction(id: string) {
  try {
    const session = await getSession();
    const student = await getStudentByIdService(session?.user ?? null, id);
    return { success: true, data: student };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return {
      success: false,
      error: "An unexpected error occurred while fetching student.",
    };
  }
}

export async function createStudentAction(input: CreateStudentInput) {
  try {
    const session = await getSession();
    const student = await createStudentService(session?.user ?? null, input);
    revalidatePath("/students");
    return { success: true, data: student };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return {
      success: false,
      error:
        (error as Error)?.message ||
        "An unexpected error occurred while creating student.",
    };
  }
}

export async function updateStudentAction(
  id: string,
  input: UpdateStudentInput
) {
  try {
    const session = await getSession();
    const student = await updateStudentService(
      session?.user ?? null,
      id,
      input
    );
    revalidatePath("/students");
    revalidatePath(`/students/${id}`);
    return { success: true, data: student };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return {
      success: false,
      error:
        (error as Error)?.message ||
        "An unexpected error occurred while updating student.",
    };
  }
}

export async function toggleStudentStatusAction(id: string, isActive: boolean) {
  try {
    const session = await getSession();
    const student = await toggleStudentStatusService(
      session?.user ?? null,
      id,
      isActive
    );
    revalidatePath("/students");
    revalidatePath(`/students/${id}`);
    return { success: true, data: student };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return {
      success: false,
      error: "An unexpected error occurred while updating status.",
    };
  }
}

export async function deleteStudentAction(id: string) {
  try {
    const session = await getSession();
    const result = await deleteStudentService(session?.user ?? null, id);
    revalidatePath("/students");
    return { success: true, data: result };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return {
      success: false,
      error: "An unexpected error occurred while deleting student.",
    };
  }
}

export async function exportStudentsCsvAction(
  config: DataTableConfig,
  columns?: DataTableColumnDef<StudentWithRelationsDto>[]
) {
  try {
    const session = await getSession();
    const { getUserPermissions } =
      await import("@/server/services/rbac.service");
    const userPermissions = session?.user?.id
      ? await getUserPermissions(session.user.id)
      : [];

    const csvContent = await exportStudentsCsvService(
      session?.user ?? null,
      config,
      columns as unknown as DataTableColumnDef<StudentWithRelations>[],
      userPermissions
    );
    return { success: true, data: csvContent };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return {
      success: false,
      error: "An unexpected error occurred while exporting students.",
    };
  }
}

export async function getStudentAcademicOptionsAction() {
  try {
    const session = await getSession();
    const user = session?.user ?? null;

    const [
      programs,
      departments,
      batches,
      academicPeriods,
      customFields,
      deptScopes,
    ] = await Promise.all([
      listProgramsService(user, { includeInactive: false }).catch(() => []),
      listDepartmentsService(user, { includeInactive: false }).catch(() => []),
      listBatchesService(user, { includeInactive: false }).catch(() => []),
      listAllAcademicPeriodsService(user, { includeInactive: false }).catch(
        () => []
      ),
      listCustomFieldDefinitionsService(user, "STUDENT", false).catch(() => []),
      user ? resolveUserDepartmentScope(user.id).catch(() => null) : null,
    ]);

    return {
      success: true,
      data: {
        programs,
        departments,
        batches,
        academicPeriods,
        customFields,
        isDepartmentScoped: deptScopes !== null,
        allowedDepartmentIds: deptScopes || [],
      },
    };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return {
      success: false,
      error: "Failed to load academic options.",
    };
  }
}

export async function getStudentAuditLogsAction(studentId: string) {
  try {
    const session = await getSession();
    const logs = await getStudentAuditLogsService(
      session?.user ?? null,
      studentId
    );
    return { success: true, data: logs };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode,
      };
    }
    return {
      success: false,
      error: "Failed to load audit logs.",
    };
  }
}
