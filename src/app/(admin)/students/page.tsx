import React from "react";
import { requireAuth } from "@/server/services/auth.service";
import { authorize } from "@/server/authorization";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";

export default async function StudentsPage() {
  const session = await requireAuth({ redirectTo: "/students" });
  await authorize(session.user, "students.read");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-white">
          <GraduationCap className="h-8 w-8 text-indigo-400" />
          Students Directory
        </h1>
        <p className="mt-1 text-slate-400">
          Manage student records, enrollment details, and academic profiles.
        </p>
      </div>

      <Card className="border-dashed border-slate-800 bg-slate-900/60 p-8 text-center">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
            <GraduationCap className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl text-white">
            Student Management Module
          </CardTitle>
          <CardDescription className="max-w-md text-slate-400">
            Student directory, custom fields integration, Excel batch import,
            and academic tracking will be implemented in Phase 5.
          </CardDescription>
        </div>
      </Card>
    </div>
  );
}
