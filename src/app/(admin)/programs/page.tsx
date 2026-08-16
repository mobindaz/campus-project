import React from "react";
import { requireAuth } from "@/server/services/auth.service";
import { listProgramsService } from "@/server/services/program.service";
import { listDepartmentsService } from "@/server/services/department.service";
import { ProgramClientWrapper } from "./client-wrapper";
import { BookOpen, GraduationCap, Building2, CheckCircle2 } from "lucide-react";

export default async function ProgramsPage() {
  const session = await requireAuth({ redirectTo: "/programs" });

  let initialPrograms: any[] = [];
  let departments: any[] = [];

  try {
    const [progs, depts] = await Promise.all([
      listProgramsService(session.user, { includeInactive: true }),
      listDepartmentsService(session.user, { includeInactive: false }),
    ]);
    initialPrograms = progs;
    departments = depts;
  } catch (error) {
    console.error("Failed to load programs or departments on server render:", error);
  }

  const totalCount = initialPrograms.length;
  const degreeCount = initialPrograms.filter((p) => p.type === "DEGREE").length;
  const diplomaCount = initialPrograms.filter((p) => p.type === "DIPLOMA").length;
  const activeCount = initialPrograms.filter((p) => p.isActive).length;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-100 tracking-tight">
                Academic Programs Management
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure degree, diploma, and certificate programs under college departments
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md flex items-center space-x-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Programs
            </p>
            <p className="text-2xl font-black text-slate-100 mt-0.5">{totalCount}</p>
          </div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Degree Programs
            </p>
            <p className="text-2xl font-black text-slate-100 mt-0.5">{degreeCount}</p>
          </div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md flex items-center space-x-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Diplomas / Certs
            </p>
            <p className="text-2xl font-black text-slate-100 mt-0.5">{diplomaCount}</p>
          </div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Programs
            </p>
            <p className="text-2xl font-black text-slate-100 mt-0.5">{activeCount}</p>
          </div>
        </div>
      </div>

      {/* Client Data Wrapper */}
      <ProgramClientWrapper initialPrograms={initialPrograms} departments={departments} />
    </div>
  );
}
