import React from "react";
import { requireAuth } from "@/server/services/auth.service";
import { listDepartmentsService } from "@/server/services/department.service";
import { DepartmentClientWrapper } from "./client-wrapper";
import { Building2, GraduationCap, Briefcase, CheckCircle2 } from "lucide-react";

export default async function DepartmentsPage() {
  const session = await requireAuth({ redirectTo: "/departments" });
  let initialDepartments: any[] = [];

  try {
    initialDepartments = await listDepartmentsService(session.user, {
      includeInactive: true,
    });
  } catch (error) {
    console.error("Failed to load departments on server render:", error);
  }

  const totalCount = initialDepartments.length;
  const academicCount = initialDepartments.filter((d) => d.type === "ACADEMIC").length;
  const adminCount = initialDepartments.filter((d) => d.type === "ADMINISTRATIVE").length;
  const activeCount = initialDepartments.filter((d) => d.isActive).length;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Title & Context Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-100 tracking-tight">
                Department Management
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure academic departments and administrative offices for your college deployment
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md flex items-center space-x-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Units
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
              Academic
            </p>
            <p className="text-2xl font-black text-slate-100 mt-0.5">{academicCount}</p>
          </div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md flex items-center space-x-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Administrative
            </p>
            <p className="text-2xl font-black text-slate-100 mt-0.5">{adminCount}</p>
          </div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Status
            </p>
            <p className="text-2xl font-black text-slate-100 mt-0.5">{activeCount}</p>
          </div>
        </div>
      </div>

      {/* Interactive Data List Wrapper */}
      <DepartmentClientWrapper initialDepartments={initialDepartments} />
    </div>
  );
}
