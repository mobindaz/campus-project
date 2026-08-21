"use client";

import React, { useState } from "react";
import {
  Building2,
  Search,
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
import { updateDepartmentAction } from "../actions";

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

export interface DepartmentListProps {
  departments: DepartmentItem[];
  onOpenCreate: () => void;
  onOpenEdit: (department: DepartmentItem) => void;
  onOpenDeactivate: (department: DepartmentItem) => void;
  onRefresh: () => void;
}

export function DepartmentList({
  departments,
  onOpenCreate,
  onOpenEdit,
  onOpenDeactivate,
  onRefresh,
}: DepartmentListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<
    "ALL" | "ACADEMIC" | "ADMINISTRATIVE"
  >("ALL");
  const [showInactive, setShowInactive] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filteredDepartments = departments.filter((dept) => {
    if (!showInactive && !dept.isActive) return false;
    if (typeFilter !== "ALL" && dept.type !== typeFilter) return false;

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const matchName = dept.name.toLowerCase().includes(term);
      const matchCode = dept.code.toLowerCase().includes(term);
      const matchDesc = dept.description?.toLowerCase().includes(term) || false;
      const matchProg =
        dept.program?.name.toLowerCase().includes(term) ||
        dept.program?.code.toLowerCase().includes(term) ||
        false;
      return matchName || matchCode || matchDesc || matchProg;
    }
    return true;
  });

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

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md sm:flex-row sm:items-center">
        {/* Search Input */}
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by department name, code, or parent program..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pr-4 pl-10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(
                  e.target.value as "ALL" | "ACADEMIC" | "ADMINISTRATIVE"
                )
              }
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="ACADEMIC">Academic</option>
              <option value="ADMINISTRATIVE">Administrative</option>
            </select>
          </div>

          <label className="flex cursor-pointer items-center space-x-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Show Inactive</span>
          </label>

          <button
            type="button"
            onClick={onOpenCreate}
            className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold whitespace-nowrap text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            <span>Add Department</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-md">
        {filteredDepartments.length === 0 ? (
          <div className="space-y-3 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">
              No departments found
            </h3>
            <p className="mx-auto max-w-sm text-xs text-slate-400">
              No academic departments or administrative offices match your
              current filter settings.
            </p>
            <button
              type="button"
              onClick={onOpenCreate}
              className="mt-2 inline-flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              <span>Create Department</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  <th className="px-4 py-3.5">Code & Name</th>
                  <th className="px-4 py-3.5">Parent Program</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Description</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredDepartments.map((dept) => (
                  <tr
                    key={dept.id}
                    className="group transition-colors hover:bg-slate-800/40"
                  >
                    {/* Code & Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-3">
                        <div className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-xs font-bold text-indigo-400">
                          {dept.code}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-100 transition-colors group-hover:text-indigo-300">
                            {dept.name}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Parent Program */}
                    <td className="px-4 py-3.5">
                      {dept.program ? (
                        <span className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-xs font-semibold text-indigo-300">
                          {dept.program.name} ({dept.program.code})
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 italic">
                          None
                        </span>
                      )}
                    </td>

                    {/* Type Badge */}
                    <td className="px-4 py-3.5">
                      {dept.type === "ACADEMIC" ? (
                        <span className="inline-flex items-center space-x-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                          <GraduationCap className="h-3.5 w-3.5" />
                          <span>Academic</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-400">
                          <Briefcase className="h-3.5 w-3.5" />
                          <span>Administrative</span>
                        </span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="max-w-xs truncate px-4 py-3.5 text-xs text-slate-400">
                      {dept.description || (
                        <span className="text-slate-600 italic">
                          No description
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      {dept.isActive ? (
                        <span className="inline-flex items-center space-x-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-400">
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(dept)}
                          disabled={togglingId === dept.id}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-indigo-400"
                          title={
                            dept.isActive
                              ? "Deactivate department"
                              : "Activate department"
                          }
                        >
                          {dept.isActive ? (
                            <ToggleRight className="h-5 w-5 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-slate-500" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenEdit(dept)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                          title="Edit department"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenDeactivate(dept)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-amber-400"
                          title="Deactivate or Delete department"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
