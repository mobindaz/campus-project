import React from "react";
import Link from "next/link";
import { requireAuth } from "@/server/services/auth.service";
import { authorize } from "@/server/authorization";
import { StudentImportWizard } from "@/modules/excel-import/components/student-import-wizard";
import { ArrowLeft, ChevronRight } from "lucide-react";

export const metadata = {
  title: "Import Students | Campus Operations Platform",
  description:
    "Bulk import students from Excel spreadsheets with error isolation.",
};

export default async function StudentImportPage() {
  const session = await requireAuth({ redirectTo: "/students/import" });
  await authorize(session.user, "students.read");

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-400">
        <Link
          href="/students"
          className="flex items-center gap-1 transition-colors hover:text-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Students Directory
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
        <span className="text-slate-200">Excel Import</span>
      </nav>

      {/* Main Wizard Client Component */}
      <StudentImportWizard onSuccessRedirectUrl="/students" />
    </div>
  );
}
