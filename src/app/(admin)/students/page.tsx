import React from "react";
import Link from "next/link";
import { requireAuth } from "@/server/services/auth.service";
import { authorize } from "@/server/authorization";
import { listProgramsService } from "@/server/services/program.service";
import { listDepartmentsService } from "@/server/services/department.service";
import { listBatchesService } from "@/server/services/batch.service";
import { StudentFormModal } from "@/modules/students/components/StudentFormModal";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Settings, FileSpreadsheet } from "lucide-react";

export default async function StudentsPage() {
  const session = await requireAuth({ redirectTo: "/students" });
  await authorize(session.user, "students.read");

  const [programs, departments, batches] = await Promise.all([
    listProgramsService(session.user, { includeInactive: false }).catch(
      () => []
    ),
    listDepartmentsService(session.user, { includeInactive: false }).catch(
      () => []
    ),
    listBatchesService(session.user, { includeInactive: false }).catch(
      () => []
    ),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-white">
            <GraduationCap className="h-8 w-8 text-indigo-400" />
            Students Directory
          </h1>
          <p className="mt-1 text-slate-400">
            Manage student records, enrollment details, and academic profiles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <Link href="/forms/STUDENT_FORM">
              <Settings className="mr-2 h-4 w-4" /> Configure Form Fields
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-white"
          >
            <Link href="/students/import">
              <FileSpreadsheet className="mr-2 h-4 w-4 text-indigo-400" />{" "}
              Import Excel
            </Link>
          </Button>

          <StudentFormModal
            optionsData={{
              programs: programs.map((p) => ({
                id: p.id,
                name: p.name,
                code: p.code,
              })),
              departments: departments.map((d) => ({
                id: d.id,
                name: d.name,
                code: d.code,
              })),
              batches: batches.map((b) => ({
                id: b.id,
                name: b.name,
                code: b.code,
              })),
            }}
          />
        </div>
      </div>

      <Card className="border-dashed border-slate-800 bg-slate-900/60 p-8 text-center">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
            <GraduationCap className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl text-white">
            Dynamic Student Registration Active
          </CardTitle>
          <CardDescription className="max-w-md text-slate-400">
            Click <strong>Register New Student</strong> above to test the live
            runtime renderer. Admins can click{" "}
            <strong>Configure Form Fields</strong> to add custom fields or edit
            layout.
          </CardDescription>
        </div>
      </Card>
    </div>
  );
}
