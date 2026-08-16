import React from "react";
import { requireAuth } from "@/server/services/auth.service";
import { authorize } from "@/server/authorization";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";

export default async function StudentsPage() {
  const session = await requireAuth({ redirectTo: "/students" });
  await authorize(session.user, "students.read");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-indigo-400" />
          Students Directory
        </h1>
        <p className="text-slate-400 mt-1">
          Manage student records, enrollment details, and academic profiles.
        </p>
      </div>

      <Card className="border-slate-800 bg-slate-900/60 p-8 text-center border-dashed">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <GraduationCap className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl text-white">Student Management Module</CardTitle>
          <CardDescription className="max-w-md text-slate-400">
            Student directory, custom fields integration, Excel batch import, and academic tracking will be implemented in Phase 5.
          </CardDescription>
        </div>
      </Card>
    </div>
  );
}
