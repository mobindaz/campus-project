"use client";

import React from "react";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Building2,
  Clock,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import type { DataTableColumnDef } from "@/components/tables/data-table.types";
import { updateProgramAction } from "../actions";
import { getProgramsPaginatedAction } from "../actions";
import { exportProgramsCsvAction } from "../actions";
import type { DepartmentOption } from "./program-form-dialog";
export type { DepartmentOption };

// ─── Row type ────────────────────────────────────────────────────────────────

export interface ProgramItem {
  id: string;
  name: string;
  code: string;
  shortName: string;
  type: "DEGREE" | "DIPLOMA" | "POST_GRADUATE" | "CERTIFICATE" | "DOCTORAL";
  durationYears: number;
  departments?: {
    id: string;
    name: string;
    code: string;
    isActive?: boolean;
  }[];
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ProgramListProps {
  permissions: string[];
  departments?: DepartmentOption[];
  onOpenCreate: () => void;
  onOpenEdit: (program: ProgramItem) => void;
  onOpenDeactivate: (program: ProgramItem) => void;
  onRefresh: () => void;
}

// ─── Type badge helper ───────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { color: string; label: string }> = {
    DEGREE: { color: "indigo", label: "Degree" },
    DIPLOMA: { color: "emerald", label: "Diploma" },
    POST_GRADUATE: { color: "purple", label: "Post Graduate" },
    CERTIFICATE: { color: "amber", label: "Certificate" },
    DOCTORAL: { color: "cyan", label: "Doctoral" },
  };

  const { color, label } = config[type] || { color: "slate", label: type };

  return (
    <span
      className={`rounded-lg border border-${color}-500/20 bg-${color}-500/10 px-2.5 py-1 text-xs font-semibold text-${color}-400`}
    >
      {label}
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProgramList({
  permissions,
  onOpenCreate,
  onOpenEdit,
  onOpenDeactivate,
  onRefresh,
}: ProgramListProps) {
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  const handleToggleStatus = async (program: ProgramItem) => {
    setTogglingId(program.id);
    try {
      await updateProgramAction(program.id, {
        isActive: !program.isActive,
      });
      onRefresh();
    } catch (error) {
      console.error("Failed to toggle program status", error);
    } finally {
      setTogglingId(null);
    }
  };

  // ── Column definitions ───────────────────────────────────────────────────

  const columns: DataTableColumnDef<ProgramItem>[] = [
    {
      id: "name",
      header: "Program Name & Code",
      accessorKey: "name",
      sortable: true,
      defaultVisible: true,
      exportAccessor: (row) => `${row.code} — ${row.name} (${row.shortName})`,
      cell: (row) => (
        <div className="flex items-center space-x-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 font-mono text-xs font-bold text-indigo-400">
            {row.code}
          </div>
          <div>
            <p className="font-semibold text-slate-100 transition-colors group-hover:text-indigo-300">
              {row.name}
            </p>
            <p className="text-xs font-medium text-slate-400">
              Short: <span className="text-slate-300">{row.shortName}</span>
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "departments",
      header: "Departments / Branches",
      sortable: false,
      defaultVisible: true,
      exportAccessor: (row) =>
        row.departments?.map((d) => `${d.name} (${d.code})`).join("; ") ?? "",
      cell: (row) =>
        row.departments && row.departments.length > 0 ? (
          <div className="flex max-w-xs flex-wrap gap-1.5">
            {row.departments.map((dept) => (
              <span
                key={dept.id}
                className="flex items-center space-x-1 rounded-md border border-slate-700/60 bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-200"
              >
                <Building2 className="h-3 w-3 text-slate-400" />
                <span>
                  {dept.name} ({dept.code})
                </span>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-slate-500 italic">
            No departments (Standalone Program)
          </span>
        ),
    },
    {
      id: "type",
      header: "Award Type",
      accessorKey: "type",
      sortable: true,
      filterable: true,
      filterOptions: [
        { label: "Degree", value: "DEGREE" },
        { label: "Diploma", value: "DIPLOMA" },
        { label: "Post Graduate", value: "POST_GRADUATE" },
        { label: "Certificate", value: "CERTIFICATE" },
        { label: "Doctoral", value: "DOCTORAL" },
      ],
      defaultVisible: true,
      cell: (row) => <TypeBadge type={row.type} />,
    },
    {
      id: "duration",
      header: "Duration",
      accessorKey: "durationYears",
      sortable: true,
      defaultVisible: true,
      exportAccessor: (row) =>
        `${row.durationYears} ${row.durationYears === 1 ? "Year" : "Years"}`,
      cell: (row) => (
        <span className="inline-flex items-center space-x-1 text-xs font-medium text-slate-300">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          <span>
            {row.durationYears} {row.durationYears === 1 ? "Year" : "Years"}
          </span>
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
            title={row.isActive ? "Deactivate program" : "Activate program"}
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
            title="Edit program"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onOpenDeactivate(row)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-amber-400"
            title="Deactivate or Delete program"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable<ProgramItem>
      columns={columns}
      fetchAction={getProgramsPaginatedAction}
      permissions={permissions}
      exportPermission="programs.export"
      exportAction={exportProgramsCsvAction}
      emptyIcon={<BookOpen className="h-6 w-6" />}
      emptyTitle="No programs found"
      emptyDescription="No academic programs match your selected search or filter criteria."
      createButton={
        <button
          type="button"
          onClick={onOpenCreate}
          className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold whitespace-nowrap text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          <span>Add Program</span>
        </button>
      }
      searchPlaceholder="Search by program name (e.g. B.Tech, Diploma, BCA)..."
    />
  );
}
