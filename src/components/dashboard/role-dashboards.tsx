import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShieldCheck, Briefcase, Building2, GraduationCap, LayoutDashboard } from "lucide-react";

interface BaseDashboardProps {
  user: { name?: string | null; email?: string | null };
  departmentScopes?: { id: string; name: string; code: string }[];
}

export function CollegeAdminDashboard({ user }: BaseDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-indigo-400" />
          College Admin Dashboard
        </h1>
        <p className="text-slate-400 mt-1">
          System configuration & overall platform analytics overview for {user.name || "Administrator"}.
        </p>
      </div>

      <Card className="border-slate-800 bg-slate-900/60 p-8 text-center border-dashed">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl text-white">System Administration Core</CardTitle>
          <CardDescription className="max-w-md text-slate-400">
            Full administrative access granted. Configurable platform modules (Departments, Dynamic Forms, Custom Fields, Workflows, Audit Logs) will populate here in subsequent build phases.
          </CardDescription>
        </div>
      </Card>
    </div>
  );
}

export function PlacementOfficerDashboard({ user }: BaseDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Briefcase className="w-8 h-8 text-indigo-400" />
          Placement Officer Dashboard
        </h1>
        <p className="text-slate-400 mt-1">
          Campus recruitment drives & company management hub for {user.name || "Placement Officer"}.
        </p>
      </div>

      <Card className="border-slate-800 bg-slate-900/60 p-8 text-center border-dashed">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Briefcase className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl text-white">Placement Operations</CardTitle>
          <CardDescription className="max-w-md text-slate-400">
            Placement drives, company registrations, student registrations, eligibility filtering, and recruitment results will populate here in Phase 6.
          </CardDescription>
        </div>
      </Card>
    </div>
  );
}

export function HODDashboard({ user, departmentScopes = [] }: BaseDashboardProps) {
  const primaryDept = departmentScopes[0]?.name || departmentScopes[0]?.code || "Department";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Building2 className="w-8 h-8 text-indigo-400" />
          HOD Dashboard — {primaryDept}
        </h1>
        <p className="text-slate-400 mt-1">
          Departmental clearance workflows & student records for {user.name || "HOD"}.
        </p>
      </div>

      <Card className="border-slate-800 bg-slate-900/60 p-8 text-center border-dashed">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Building2 className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl text-white">Department Workflow Authority</CardTitle>
          <CardDescription className="max-w-md text-slate-400">
            Department-scoped TC clearance approvals and student record management will populate here in Phase 7.
          </CardDescription>
        </div>
      </Card>
    </div>
  );
}

export function StudentDashboard({ user }: BaseDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-indigo-400" />
          Student Portal Dashboard
        </h1>
        <p className="text-slate-400 mt-1">
          Welcome back, {user.name || "Student"}. Manage your placement drives and TC requests.
        </p>
      </div>

      <Card className="border-slate-800 bg-slate-900/60 p-8 text-center border-dashed">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <GraduationCap className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl text-white">Student Self-Service Portal</CardTitle>
          <CardDescription className="max-w-md text-slate-400">
            View active campus placement drives, apply for drives, track TC clearance status, and download certificates here.
          </CardDescription>
        </div>
      </Card>
    </div>
  );
}

export function DefaultDashboard({ user }: BaseDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-indigo-400" />
          Campus Operations Dashboard
        </h1>
        <p className="text-slate-400 mt-1">
          Welcome back, {user.name || "User"}.
        </p>
      </div>

      <Card className="border-slate-800 bg-slate-900/60 p-8 text-center border-dashed">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl text-white">Authenticated Dashboard Shell</CardTitle>
          <CardDescription className="max-w-md text-slate-400">
            Select a module from the sidebar navigation menu to get started.
          </CardDescription>
        </div>
      </Card>
    </div>
  );
}

export function RoleDashboardDispatcher({
  userRoles = [],
  user,
  departmentScopes = [],
}: {
  userRoles: { id: string; name: string; code: string }[];
  user: { name?: string | null; email?: string | null };
  departmentScopes?: { id: string; name: string; code: string }[];
}) {
  const roleCodes = new Set(userRoles.map((r) => r.code));

  if (roleCodes.has("college_admin")) {
    return <CollegeAdminDashboard user={user} departmentScopes={departmentScopes} />;
  }
  if (roleCodes.has("placement_officer")) {
    return <PlacementOfficerDashboard user={user} departmentScopes={departmentScopes} />;
  }
  if (roleCodes.has("hod")) {
    return <HODDashboard user={user} departmentScopes={departmentScopes} />;
  }
  if (roleCodes.has("student")) {
    return <StudentDashboard user={user} departmentScopes={departmentScopes} />;
  }

  return <DefaultDashboard user={user} departmentScopes={departmentScopes} />;
}
