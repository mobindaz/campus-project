import React from "react";
import { requireAuth } from "@/server/services/auth.service";
import { listProgramsService } from "@/server/services/program.service";
import { listDepartmentsService } from "@/server/services/department.service";
import { ProgramClientWrapper } from "./client-wrapper";
import { BookOpen, GraduationCap, Building2, CheckCircle2 } from "lucide-react";
import {
  ProgramItem,
  DepartmentOption,
} from "@/modules/programs/components/program-list";

export default async function ProgramsPage() {
  const session = await requireAuth({ redirectTo: "/programs" });

  let initialPrograms: ProgramItem[] = [];
  let departments: DepartmentOption[] = [];

  try {
    const [progs, depts] = await Promise.all([
      listProgramsService(session.user, { includeInactive: true }),
      listDepartmentsService(session.user, { includeInactive: false }),
    ]);
    initialPrograms = progs;
    departments = depts;
  } catch (error) {
    console.error(
      "Failed to load programs or departments on server render:",
      error
    );
  }

  const totalCount = initialPrograms.length;
  const degreeCount = initialPrograms.filter((p) => p.type === "DEGREE").length;
  const diplomaCount = initialPrograms.filter(
    (p) => p.type === "DIPLOMA"
  ).length;
  const activeCount = initialPrograms.filter((p) => p.isActive).length;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center space-x-3">
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-2.5 text-indigo-400">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-100">
                Academic Programs Management
              </h1>
              <p className="mt-0.5 text-xs text-slate-400">
                Configure degree, diploma, and certificate programs under
                college departments
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center space-x-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-indigo-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Total Programs
            </p>
            <p className="mt-0.5 text-2xl font-black text-slate-100">
              {totalCount}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Degree Programs
            </p>
            <p className="mt-0.5 text-2xl font-black text-slate-100">
              {degreeCount}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-cyan-400">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Diplomas / Certs
            </p>
            <p className="mt-0.5 text-2xl font-black text-slate-100">
              {diplomaCount}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Active Programs
            </p>
            <p className="mt-0.5 text-2xl font-black text-slate-100">
              {activeCount}
            </p>
          </div>
        </div>
      </div>

      {/* Client Data Wrapper */}
      <ProgramClientWrapper
        initialPrograms={initialPrograms}
        departments={departments}
      />
    </div>
  );
}
