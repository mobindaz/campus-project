import React from "react";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/server/services/auth.service";
import {
  getStudentAuditLogsService,
  getStudentByIdService,
  resolveUserDepartmentScope,
} from "@/server/services/student.service";
import { listProgramsService } from "@/server/services/program.service";
import { listDepartmentsService } from "@/server/services/department.service";
import { listBatchesService } from "@/server/services/batch.service";
import { listAllAcademicPeriodsService } from "@/server/services/academic-period.service";
import { listCustomFieldDefinitionsService } from "@/server/services/custom-field.service";
import { getUserPermissions } from "@/server/services/rbac.service";
import { StudentProfileView } from "@/modules/students/components/student-profile-view";
import { AppError } from "@/server/errors/app-error";
import type {
  StudentWithRelationsDto,
  StudentAuditLogItem,
} from "@/modules/students/types";
import type { CustomFieldDefinitionDto } from "@/modules/custom-fields/types";

interface StudentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentDetailPage({
  params,
}: StudentDetailPageProps) {
  const { id } = await params;
  const session = await requireAuth({ redirectTo: `/students/${id}` });

  let student: StudentWithRelationsDto;
  let permissions: string[] = [];
  let customFields: CustomFieldDefinitionDto[] = [];
  let auditLogs: StudentAuditLogItem[] = [];
  let programs: {
    id: string;
    name: string;
    code: string;
    shortName?: string | null;
  }[] = [];
  let departments: {
    id: string;
    name: string;
    code: string;
    programId?: string | null;
  }[] = [];
  let batches: {
    id: string;
    name: string;
    code: string;
    programId: string;
    departmentId?: string | null;
  }[] = [];
  let academicPeriods: {
    id: string;
    name: string;
    code: string;
    programId: string;
    departmentId?: string | null;
    orderIndex?: number | null;
  }[] = [];
  let allowedDeptIds: string[] | null = null;

  try {
    const [
      studentData,
      permissionsData,
      customFieldsData,
      auditLogsData,
      programsData,
      departmentsData,
      batchesData,
      academicPeriodsData,
      deptScopesData,
    ] = await Promise.all([
      getStudentByIdService(session.user, id),
      getUserPermissions(session.user.id),
      listCustomFieldDefinitionsService(session.user, "STUDENT", false).catch(
        () => []
      ),
      getStudentAuditLogsService(session.user, id).catch(() => []),
      listProgramsService(session.user, { includeInactive: false }).catch(
        () => []
      ),
      listDepartmentsService(session.user, { includeInactive: false }).catch(
        () => []
      ),
      listBatchesService(session.user, { includeInactive: false }).catch(
        () => []
      ),
      listAllAcademicPeriodsService(session.user, {
        includeInactive: false,
      }).catch(() => []),
      resolveUserDepartmentScope(session.user.id),
    ]);

    student = studentData as unknown as StudentWithRelationsDto;
    permissions = permissionsData;
    customFields = customFieldsData as unknown as CustomFieldDefinitionDto[];
    auditLogs = auditLogsData as unknown as StudentAuditLogItem[];
    programs = programsData;
    departments = departmentsData;
    batches = batchesData;
    academicPeriods = academicPeriodsData;
    allowedDeptIds = deptScopesData;
  } catch (error: unknown) {
    if (error instanceof AppError && error.statusCode === 404) {
      notFound();
    }
    if (error instanceof AppError && error.statusCode === 403) {
      redirect("/students");
    }
    throw error;
  }

  const isDepartmentScoped = allowedDeptIds !== null;
  const visibleDepartments = isDepartmentScoped
    ? departments.filter((d) => allowedDeptIds?.includes(d.id))
    : departments;

  const optionsData = {
    programs: programs.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      shortName: p.shortName || p.name,
    })),
    departments: visibleDepartments.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      programId: d.programId,
    })),
    batches: batches.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      programId: b.programId,
      departmentId: b.departmentId,
    })),
    academicPeriods: academicPeriods.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      programId: p.programId,
      departmentId: p.departmentId,
      orderIndex: p.orderIndex || 0,
    })),
  };

  return (
    <StudentProfileView
      student={student}
      customFieldDefinitions={customFields}
      options={optionsData}
      auditLogs={auditLogs}
      permissions={permissions}
    />
  );
}
