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
  Filter,
  Layers,
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
  const [typeFilter, setTypeFilter] = useState<"ALL" | "ACADEMIC" | "ADMINISTRATIVE">("ALL");
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
      return matchName || matchCode || matchDesc;
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/60 p-4 border border-slate-800 rounded-2xl backdrop-blur-md">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, code, or description..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="ALL">All Types</option>
              <option value="ACADEMIC">Academic</option>
              <option value="ADMINISTRATIVE">Administrative</option>
            </select>
          </div>

          <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer bg-slate-950 px-3 py-2 border border-slate-800 rounded-xl">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Show Inactive</span>
          </label>

          <button
            type="button"
            onClick={onOpenCreate}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center space-x-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        {filteredDepartments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">No departments found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No academic departments or administrative offices match your current filter settings.
            </p>
            <button
              type="button"
              onClick={onOpenCreate}
              className="mt-2 inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Department</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Code & Name</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredDepartments.map((dept) => (
                  <tr
                    key={dept.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Code & Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono font-bold text-indigo-400">
                          {dept.code}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                            {dept.name}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="py-3.5 px-4">
                      {dept.type === "ACADEMIC" ? (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>Academic</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          <Briefcase className="w-3.5 h-3.5" />
                          <span>Administrative</span>
                        </span>
                      )}
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-4 max-w-xs truncate text-xs text-slate-400">
                      {dept.description || <span className="italic text-slate-600">No description</span>}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {dept.isActive ? (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(dept)}
                          disabled={togglingId === dept.id}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title={dept.isActive ? "Deactivate department" : "Activate department"}
                        >
                          {dept.isActive ? (
                            <ToggleRight className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-slate-500" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenEdit(dept)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Edit department"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenDeactivate(dept)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Deactivate or Delete department"
                        >
                          <Trash2 className="w-4 h-4" />
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
