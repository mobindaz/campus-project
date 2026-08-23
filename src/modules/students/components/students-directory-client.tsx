"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Plus,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/data-table";
import { getStudentTableColumns } from "./student-table-columns";
import { StudentFormDialog } from "./student-form-dialog";
import {
  deleteStudentAction,
  exportStudentsCsvAction,
  listStudentsPaginatedAction,
  toggleStudentStatusAction,
} from "../actions";
import type { StudentWithRelationsDto, StudentFormOptionsData } from "../types";
import type { CustomFieldDefinitionDto } from "@/modules/custom-fields/types";

export interface StudentsDirectoryClientProps {
  permissions: string[];
  options: StudentFormOptionsData;
  customFields?: CustomFieldDefinitionDto[];
  isDepartmentScoped?: boolean;
  scopedDepartmentNames?: string[];
}

export function StudentsDirectoryClient({
  permissions,
  options,
  customFields = [],
  isDepartmentScoped = false,
  scopedDepartmentNames = [],
}: StudentsDirectoryClientProps) {
  const [tableKey, setTableKey] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStudent, setEditingStudent] =
    useState<StudentWithRelationsDto | null>(null);
  const [deletingStudent, setDeletingStudent] =
    useState<StudentWithRelationsDto | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canCreate = permissions.includes("students.create");

  const handleRefresh = useCallback(() => {
    setTableKey((prev) => prev + 1);
  }, []);

  const handleToggleStatus = useCallback(
    async (student: StudentWithRelationsDto) => {
      setTogglingId(student.id);
      try {
        await toggleStudentStatusAction(student.id, !student.isActive);
        handleRefresh();
      } catch (error) {
        console.error("Failed to toggle student status:", error);
      } finally {
        setTogglingId(null);
      }
    },
    [handleRefresh]
  );

  const handleDelete = async () => {
    if (!deletingStudent) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteStudentAction(deletingStudent.id);
      if (res.success) {
        setDeletingStudent(null);
        handleRefresh();
      } else {
        setDeleteError(res.error || "Failed to delete student.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter dropdown options for the dynamic table
  const departmentFilterOptions = useMemo(
    () =>
      options.departments.map((d) => ({
        label: d.name,
        value: d.id,
      })),
    [options.departments]
  );

  const programFilterOptions = useMemo(
    () =>
      options.programs.map((p) => ({
        label: `${p.name} (${p.code})`,
        value: p.id,
      })),
    [options.programs]
  );

  const batchFilterOptions = useMemo(
    () =>
      options.batches.map((b) => ({
        label: `${b.name} (${b.code})`,
        value: b.id,
      })),
    [options.batches]
  );

  const academicPeriodFilterOptions = useMemo(
    () =>
      options.academicPeriods.map((p) => ({
        label: `${p.name} (${p.code})`,
        value: p.id,
      })),
    [options.academicPeriods]
  );

  const columns = useMemo(
    () =>
      getStudentTableColumns({
        onOpenEdit: (student) => setEditingStudent(student),
        onOpenDelete: (student) => setDeletingStudent(student),
        onToggleStatus: handleToggleStatus,
        togglingId,
        permissions,
        departmentFilterOptions: !isDepartmentScoped
          ? departmentFilterOptions
          : [],
        programFilterOptions,
        batchFilterOptions,
        academicPeriodFilterOptions,
      }),
    [
      handleToggleStatus,
      togglingId,
      permissions,
      isDepartmentScoped,
      departmentFilterOptions,
      programFilterOptions,
      batchFilterOptions,
      academicPeriodFilterOptions,
    ]
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-white">
            <GraduationCap className="h-8 w-8 text-indigo-400" />
            Students Directory
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Search, filter, manage, and view detailed academic and personal
            profiles for all enrolled students.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            asChild
            variant="outline"
            className="border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <Link href="/forms/STUDENT_FORM">
              <Settings className="mr-2 h-4 w-4 text-slate-400" /> Configure
              Form Fields
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

          {canCreate && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-indigo-600 font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500"
            >
              <Plus className="mr-2 h-4 w-4" /> Register New Student
            </Button>
          )}
        </div>
      </div>

      {/* Department Scope Banner (§43) */}
      {isDepartmentScoped && (
        <div className="flex items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-sm text-indigo-300">
          <ShieldCheck className="h-5 w-5 shrink-0 text-indigo-400" />
          <div>
            <span className="font-semibold text-indigo-200">
              Department-Scoped View Active (§43):
            </span>{" "}
            You have assigned department scope for{" "}
            <strong>
              {scopedDepartmentNames.length > 0
                ? scopedDepartmentNames.join(", ")
                : "your department"}
            </strong>
            . Records from other departments are hidden automatically per access
            policy.
          </div>
        </div>
      )}

      {/* Dynamic Data Table */}
      <DataTable<StudentWithRelationsDto>
        key={tableKey}
        columns={columns}
        fetchAction={listStudentsPaginatedAction}
        permissions={permissions}
        exportPermission="students.read"
        exportAction={exportStudentsCsvAction}
        emptyIcon={<GraduationCap className="h-8 w-8 text-slate-500" />}
        emptyTitle="No student records found"
        emptyDescription="No student profiles match your search criteria or assigned department filter scope."
        searchPlaceholder="Search by register number, name, email, or phone..."
        defaultPageSize={10}
      />

      {/* Create / Edit Student Dialog */}
      {(isCreateOpen || Boolean(editingStudent)) && (
        <StudentFormDialog
          isOpen={isCreateOpen || Boolean(editingStudent)}
          onClose={() => {
            setIsCreateOpen(false);
            setEditingStudent(null);
          }}
          onSuccess={() => {
            handleRefresh();
          }}
          student={editingStudent}
          options={options}
          customFields={customFields}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center space-x-3 text-red-400">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="text-lg font-bold text-white">
                Delete Student Record?
              </h3>
            </div>

            <p className="text-sm text-slate-300">
              Are you sure you want to remove student{" "}
              <strong>{deletingStudent.name}</strong> (
              {deletingStudent.registerNumber})? If foreign references exist,
              the student will be safely deactivated instead of deleted to
              preserve audit trails.
            </p>

            {deleteError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeletingStudent(null)}
                disabled={isDeleting}
                className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 font-semibold text-white hover:bg-red-500"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
