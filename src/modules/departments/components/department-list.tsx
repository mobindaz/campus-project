"use client";

import React from "react";
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Briefcase,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import type { DataTableColumnDef } from "@/components/tables/data-table.types";
import { updateDepartmentAction } from "../actions";
import { getDepartmentsPaginatedAction } from "../actions";
import { exportDepartmentsCsvAction } from "../actions";

// ─── Row type ────────────────────────────────────────────────────────────────

export interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  type: "ACADEMIC" | "ADMINISTRATIVE";
  description?: string | null;
  programId?: string | null;
  program?: {
    id: string;
    name: string;
    code: string;
  } | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface DepartmentListProps {
  permissions: string[];
  onOpenCreate: () => void;
  onOpenEdit: (department: DepartmentItem) => void;
  onOpenDeactivate: (department: DepartmentItem) => void;
  onRefresh: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DepartmentList({
  permissions,
  onOpenCreate,
  onOpenEdit,
  onOpenDeactivate,
  onRefresh,
}: DepartmentListProps) {
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  const handleToggleStatus = async (dept: DepartmentItem) => {
    setTogglingId(dept.id);
    try {
      await updateDepartmentAction(dept.id, { isActive: !dept.isActive });
      onRefresh();
    } catch (error) {
      console.error("Failed to toggle status", error);
    } finally {
      setTogglingId(null);
    }
  };

  // ── Column definitions ───────────────────────────────────────────────────

  const columns: DataTableColumnDef<DepartmentItem>[] = [
    {
      id: "name",
      header: "Code & Name",
      accessorKey: "name",
      sortable: true,
      defaultVisible: true,
      exportAccessor: (row) => `${row.code} — ${row.name}`,
      cell: (row) => (
        <div className="flex items-center space-x-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-xs font-bold text-indigo-400">
            {row.code}
          </div>
          <p className="font-semibold text-slate-100 transition-colors group-hover:text-indigo-300">
            {row.name}
          </p>
        </div>
      ),
    },
    {
      id: "program",
      header: "Parent Program",
      accessorKey: "program.name",
      sortable: false,
      defaultVisible: true,
      exportAccessor: (row) =>
        row.program ? `${row.program.name} (${row.program.code})` : "",
      cell: (row) =>
        row.program ? (
          <span className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-xs font-semibold text-indigo-300">
            {row.program.name} ({row.program.code})
          </span>
        ) : (
          <span className="text-xs text-slate-500 italic">None</span>
        ),
    },
    {
      id: "type",
      header: "Type",
      accessorKey: "type",
      sortable: true,
      filterable: true,
      filterOptions: [
        { label: "Academic", value: "ACADEMIC" },
        { label: "Administrative", value: "ADMINISTRATIVE" },
      ],
      defaultVisible: true,
      exportAccessor: (row) =>
        row.type === "ACADEMIC" ? "Academic" : "Administrative",
      cell: (row) =>
        row.type === "ACADEMIC" ? (
          <span className="inline-flex items-center space-x-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Academic</span>
          </span>
        ) : (
          <span className="inline-flex items-center space-x-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-400">
            <Briefcase className="h-3.5 w-3.5" />
            <span>Administrative</span>
          </span>
        ),
    },
    {
      id: "description",
      header: "Description",
      accessorKey: "description",
      sortable: false,
      defaultVisible: true,
      cell: (row) => (
        <span className="max-w-xs truncate text-xs text-slate-400">
          {row.description || (
            <span className="text-slate-600 italic">No description</span>
          )}
        </span>
      ),
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
          <button
            type="button"
            onClick={() => handleToggleStatus(row)}
            disabled={togglingId === row.id}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-indigo-400"
            title={
              row.isActive ? "Deactivate department" : "Activate department"
            }
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
            title="Edit department"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onOpenDeactivate(row)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-amber-400"
            title="Deactivate or Delete department"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable<DepartmentItem>
      columns={columns}
      fetchAction={getDepartmentsPaginatedAction}
      permissions={permissions}
      exportPermission="departments.export"
      exportAction={exportDepartmentsCsvAction}
      emptyIcon={<Building2 className="h-6 w-6" />}
      emptyTitle="No departments found"
      emptyDescription="No academic departments or administrative offices match your current filter settings."
      createButton={
        <button
          type="button"
          onClick={onOpenCreate}
          className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold whitespace-nowrap text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          <span>Add Department</span>
        </button>
      }
      searchPlaceholder="Search by department name, code, or description..."
    />
  );
}
