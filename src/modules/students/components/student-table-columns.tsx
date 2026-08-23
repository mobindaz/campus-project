"use client";

import React from "react";
import Link from "next/link";
import {
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Eye,
  Hash,
  GraduationCap,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DataTableColumnDef } from "@/components/tables/data-table.types";
import type { StudentWithRelationsDto } from "../types";

export interface StudentTableColumnsProps {
  onOpenEdit: (student: StudentWithRelationsDto) => void;
  onOpenDelete: (student: StudentWithRelationsDto) => void;
  onToggleStatus: (student: StudentWithRelationsDto) => void;
  togglingId?: string | null;
  permissions: string[];
  departmentFilterOptions?: { label: string; value: string }[];
  programFilterOptions?: { label: string; value: string }[];
  batchFilterOptions?: { label: string; value: string }[];
  academicPeriodFilterOptions?: { label: string; value: string }[];
}

export function getStudentTableColumns({
  onOpenEdit,
  onOpenDelete,
  onToggleStatus,
  togglingId,
  permissions,
  departmentFilterOptions = [],
  programFilterOptions = [],
  batchFilterOptions = [],
  academicPeriodFilterOptions = [],
}: StudentTableColumnsProps): DataTableColumnDef<StudentWithRelationsDto>[] {
  const canUpdate = permissions.includes("students.update");
  const canDelete = permissions.includes("students.delete");

  return [
    {
      id: "registerNumber",
      header: "Register No.",
      accessorKey: "registerNumber",
      sortable: true,
      defaultVisible: true,
      exportAccessor: (row) => row.registerNumber,
      cell: (row) => (
        <Link
          href={`/students/${row.id}`}
          className="group inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-xs font-bold text-indigo-400 transition-all hover:border-indigo-500/50 hover:bg-slate-900 hover:text-indigo-300"
        >
          <Hash className="h-3 w-3 text-slate-500 transition-colors group-hover:text-indigo-400" />
          <span>{row.registerNumber}</span>
        </Link>
      ),
    },
    {
      id: "name",
      header: "Student Name",
      accessorKey: "name",
      sortable: true,
      defaultVisible: true,
      exportAccessor: (row) => row.name,
      cell: (row) => (
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-xs font-bold text-indigo-400">
            {row.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div>
            <Link
              href={`/students/${row.id}`}
              className="font-semibold text-slate-100 hover:text-indigo-400 hover:underline"
            >
              {row.name}
            </Link>
            {row.email && <p className="text-xs text-slate-400">{row.email}</p>}
          </div>
        </div>
      ),
    },
    {
      id: "department",
      header: "Department",
      accessorKey: "department.name",
      sortable: false,
      filterable: departmentFilterOptions.length > 0,
      filterOptions: departmentFilterOptions,
      defaultVisible: true,
      exportAccessor: (row) => row.department?.name || "None",
      cell: (row) =>
        row.department ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs font-medium text-slate-300">
            <Building2 className="h-3 w-3 text-indigo-400" />
            {row.department.name}
          </span>
        ) : (
          <span className="text-xs text-slate-500 italic">Unassigned</span>
        ),
    },
    {
      id: "program",
      header: "Program",
      accessorKey: "program.shortName",
      sortable: false,
      filterable: programFilterOptions.length > 0,
      filterOptions: programFilterOptions,
      defaultVisible: true,
      exportAccessor: (row) => row.program?.name || "",
      cell: (row) =>
        row.program ? (
          <span className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-xs font-semibold text-indigo-300">
            <GraduationCap className="h-3 w-3" />
            {row.program.shortName || row.program.code}
          </span>
        ) : null,
    },
    {
      id: "batch",
      header: "Batch",
      accessorKey: "batch.name",
      sortable: false,
      filterable: batchFilterOptions.length > 0,
      filterOptions: batchFilterOptions,
      defaultVisible: true,
      exportAccessor: (row) => row.batch?.name || "",
      cell: (row) =>
        row.batch ? (
          <span className="text-xs text-slate-300">
            {row.batch.name} ({row.batch.admissionYear}–
            {row.batch.graduationYear})
          </span>
        ) : null,
    },
    {
      id: "academicPeriod",
      header: "Period / Semester",
      accessorKey: "academicPeriod.name",
      sortable: false,
      filterable: academicPeriodFilterOptions.length > 0,
      filterOptions: academicPeriodFilterOptions,
      defaultVisible: true,
      exportAccessor: (row) => row.academicPeriod?.name || "",
      cell: (row) =>
        row.academicPeriod ? (
          <span className="inline-flex items-center rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-medium text-emerald-400">
            {row.academicPeriod.name}
          </span>
        ) : null,
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "isActive",
      sortable: true,
      filterable: true,
      filterOptions: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" },
      ],
      defaultVisible: true,
      exportAccessor: (row) => (row.isActive ? "Active" : "Inactive"),
      cell: (row) =>
        row.isActive ? (
          <span className="inline-flex items-center space-x-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Active</span>
          </span>
        ) : (
          <span className="inline-flex items-center space-x-1.5 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-400">
            <XCircle className="h-3.5 w-3.5" />
            <span>Inactive</span>
          </span>
        ),
    },
    {
      id: "actions",
      header: "Actions",
      sortable: false,
      defaultVisible: true,
      cell: (row) => (
        <div className="flex items-center justify-end space-x-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-400 hover:bg-slate-800 hover:text-indigo-400"
            title="View Profile"
          >
            <Link href={`/students/${row.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>

          {canUpdate && (
            <>
              <button
                type="button"
                onClick={() => onToggleStatus(row)}
                disabled={togglingId === row.id}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-indigo-400"
                title={row.isActive ? "Deactivate student" : "Activate student"}
              >
                {row.isActive ? (
                  <ToggleRight className="h-5 w-5 text-emerald-400" />
                ) : (
                  <ToggleLeft className="h-5 w-5 text-slate-500" />
                )}
              </button>

              <button
                type="button"
                onClick={() => onOpenEdit(row)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                title="Edit student"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </>
          )}

          {canDelete && (
            <button
              type="button"
              onClick={() => onOpenDelete(row)}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-400"
              title="Delete student"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];
}
