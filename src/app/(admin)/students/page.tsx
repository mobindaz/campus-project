import React from "react";
import { requireAuth } from "@/server/services/auth.service";
import { authorize } from "@/server/authorization";
import { listProgramsService } from "@/server/services/program.service";
import { listDepartmentsService } from "@/server/services/department.service";
import { listBatchesService } from "@/server/services/batch.service";
import { listAllAcademicPeriodsService } from "@/server/services/academic-period.service";
import { listCustomFieldDefinitionsService } from "@/server/services/custom-field.service";
import {
  getUserPermissions,
  getUserDepartmentScopes,
} from "@/server/services/rbac.service";
import { resolveUserDepartmentScope } from "@/server/services/student.service";
import { StudentsDirectoryClient } from "@/modules/students/components/students-directory-client";
import type { CustomFieldDefinitionDto } from "@/modules/custom-fields/types";

export default async function StudentsPage() {
  const session = await requireAuth({ redirectTo: "/students" });
  await authorize(session.user, "students.read");

  const [
    permissions,
    userScopes,
    allowedDeptIds,
    programs,
    departments,
    batches,
    academicPeriods,
    customFields,
  ] = await Promise.all([
    getUserPermissions(session.user.id),
    getUserDepartmentScopes(session.user.id),
    resolveUserDepartmentScope(session.user.id),
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
    listCustomFieldDefinitionsService(session.user, "STUDENT", false).catch(
      () => []
    ),
  ]);

  const isDepartmentScoped = allowedDeptIds !== null;
  const scopedDepartmentNames = userScopes.map((s) => s.name);

  // If user is department-scoped, filter available departments to only those they have scope over
  const visibleDepartments = isDepartmentScoped
    ? departments.filter((d) => allowedDeptIds.includes(d.id))
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
    <StudentsDirectoryClient
      permissions={permissions}
      options={optionsData}
      customFields={customFields as unknown as CustomFieldDefinitionDto[]}
      isDepartmentScoped={isDepartmentScoped}
      scopedDepartmentNames={scopedDepartmentNames}
    />
  );
}
