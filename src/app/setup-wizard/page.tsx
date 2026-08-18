import React from "react";
import { getSetupWizardStatusService } from "@/server/services/college-profile.service";
import { listDepartmentsService } from "@/server/services/department.service";
import { listProgramsService } from "@/server/services/program.service";
import { getSession } from "@/server/services/auth.service";
import { SetupWizardClientWrapper } from "./client-wrapper";
import { DepartmentItem } from "@/modules/departments/components/department-list";
import { ProgramOption } from "@/modules/academic-structure/components/period-manager";

export default async function SetupWizardPage() {
  const session = await getSession();
  const status = await getSetupWizardStatusService();

  // If already configured and not explicitly visiting setup, redirect to dashboard
  if (
    status.isConfigured &&
    status.counts.deptCount > 0 &&
    status.counts.programCount > 0
  ) {
    // allow revisiting if user clicked setup link
  }

  let departments: DepartmentItem[] = [];
  let programs: ProgramOption[] = [];

  if (session?.user) {
    try {
      const [depts, progs] = await Promise.all([
        listDepartmentsService(session.user, { includeInactive: false }),
        listProgramsService(session.user, { includeInactive: false }),
      ]);
      departments = depts;
      programs = progs;
    } catch (e) {
      console.error("Setup wizard data fetch notice:", e);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <SetupWizardClientWrapper
        initialStatus={status}
        initialDepartments={departments}
        initialPrograms={programs}
        currentUserEmail={session?.user?.email || "admin@college.edu"}
      />
    </div>
  );
}
