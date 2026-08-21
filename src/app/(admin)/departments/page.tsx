import React from "react";
import { requireAuth } from "@/server/services/auth.service";
import { listDepartmentsService } from "@/server/services/department.service";
import { DepartmentClientWrapper } from "./client-wrapper";
import { DepartmentItem } from "@/modules/departments/components/department-list";
import {
  Building2,
  GraduationCap,
  Briefcase,
  CheckCircle2,
} from "lucide-react";

export default async function DepartmentsPage() {
  const session = await requireAuth({ redirectTo: "/departments" });
  let initialDepartments: DepartmentItem[] = [];

  try {
    initialDepartments = await listDepartmentsService(session.user, {
      includeInactive: true,
    });
  } catch (error) {
    console.error("Failed to load departments on server render:", error);
  }

  const totalCount = initialDepartments.length;
  const academicCount = initialDepartments.filter(
    (d) => d.type === "ACADEMIC"
  ).length;
  const adminCount = initialDepartments.filter(
    (d) => d.type === "ADMINISTRATIVE"
  ).length;
  const activeCount = initialDepartments.filter((d) => d.isActive).length;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      {/* Page Title & Context Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center space-x-3">
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-2.5 text-indigo-400">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-100">
                Department Management
              </h1>
              <p className="mt-0.5 text-xs text-slate-400">
                Configure academic departments and administrative offices for
                your college deployment
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center space-x-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-indigo-400">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Total Units
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
              Academic
            </p>
            <p className="mt-0.5 text-2xl font-black text-slate-100">
              {academicCount}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-cyan-400">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Administrative
            </p>
            <p className="mt-0.5 text-2xl font-black text-slate-100">
              {adminCount}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Active Status
            </p>
            <p className="mt-0.5 text-2xl font-black text-slate-100">
              {activeCount}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Data List Wrapper */}
      <DepartmentClientWrapper initialDepartments={initialDepartments} />
    </div>
  );
}
