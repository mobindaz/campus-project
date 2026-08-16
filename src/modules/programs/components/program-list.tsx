"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Search,
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
import { updateProgramAction } from "../actions";
import { DepartmentOption } from "./program-form-dialog";

export interface ProgramItem {
  id: string;
  name: string;
  code: string;
  shortName: string;
  type: "DEGREE" | "DIPLOMA" | "POST_GRADUATE" | "CERTIFICATE" | "DOCTORAL";
  durationYears: number;
  departmentId: string;
  department: {
    id: string;
    name: string;
    code: string;
  };
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ProgramListProps {
  programs: ProgramItem[];
  departments: DepartmentOption[];
  onOpenCreate: () => void;
  onOpenEdit: (program: ProgramItem) => void;
  onOpenDeactivate: (program: ProgramItem) => void;
  onRefresh: () => void;
}

export function ProgramList({
  programs,
  departments,
  onOpenCreate,
  onOpenEdit,
  onOpenDeactivate,
  onRefresh,
}: ProgramListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [showInactive, setShowInactive] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filteredPrograms = programs.filter((program) => {
    if (!showInactive && !program.isActive) return false;
    if (selectedDeptId !== "ALL" && program.departmentId !== selectedDeptId) return false;
    if (typeFilter !== "ALL" && program.type !== typeFilter) return false;

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const matchName = program.name.toLowerCase().includes(term);
      const matchCode = program.code.toLowerCase().includes(term);
      const matchShort = program.shortName.toLowerCase().includes(term);
      const matchDept = program.department.name.toLowerCase().includes(term);
      return matchName || matchCode || matchShort || matchDept;
    }
    return true;
  });

  const handleToggleStatus = async (program: ProgramItem) => {
    setTogglingId(program.id);
    try {
      await updateProgramAction(program.id, { isActive: !program.isActive });
      onRefresh();
    } catch (error) {
      console.error("Failed to toggle program status", error);
    } finally {
      setTogglingId(null);
    }
  };

  const renderTypeBadge = (type: string) => {
    switch (type) {
      case "DEGREE":
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Degree
          </span>
        );
      case "DIPLOMA":
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Diploma
          </span>
        );
      case "POST_GRADUATE":
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Post Graduate
          </span>
        );
      case "CERTIFICATE":
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Certificate
          </span>
        );
      case "DOCTORAL":
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            Doctoral
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls & Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-slate-900/60 p-4 border border-slate-800 rounded-2xl backdrop-blur-md">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by program name, code, or short name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
          />
        </div>

        {/* Department Filter & Award Type Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-indigo-400 hidden sm:inline" />
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 max-w-[200px] truncate"
            >
              <option value="ALL">All Departments ({departments.length})</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            <option value="ALL">All Award Types</option>
            <option value="DEGREE">Degree</option>
            <option value="DIPLOMA">Diploma</option>
            <option value="POST_GRADUATE">Post Graduate</option>
            <option value="CERTIFICATE">Certificate</option>
            <option value="DOCTORAL">Doctoral</option>
          </select>

          {/* Inactive Toggle */}
          <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer bg-slate-950 px-3 py-2 border border-slate-800 rounded-xl">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Show Inactive</span>
          </label>

          {/* Add Program CTA */}
          <button
            type="button"
            onClick={onOpenCreate}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center space-x-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Program</span>
          </button>
        </div>
      </div>

      {/* Table Data Grid */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        {filteredPrograms.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">No programs found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No academic programs match your selected department or filter criteria.
            </p>
            <button
              type="button"
              onClick={onOpenCreate}
              className="mt-2 inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Program</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Program Name & Code</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Award Type</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredPrograms.map((program) => (
                  <tr
                    key={program.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Program Name & Code */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono font-bold text-indigo-400">
                          {program.code}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                            {program.name}
                          </p>
                          <p className="text-xs text-slate-400 font-medium">
                            Short: <span className="text-slate-300">{program.shortName}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs font-medium text-slate-200">
                          {program.department.name} ({program.department.code})
                        </span>
                      </div>
                    </td>

                    {/* Award Type */}
                    <td className="py-3.5 px-4">{renderTypeBadge(program.type)}</td>

                    {/* Duration */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center space-x-1 text-xs text-slate-300 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{program.durationYears} {program.durationYears === 1 ? "Year" : "Years"}</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {program.isActive ? (
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
                          onClick={() => handleToggleStatus(program)}
                          disabled={togglingId === program.id}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title={program.isActive ? "Deactivate program" : "Activate program"}
                        >
                          {program.isActive ? (
                            <ToggleRight className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-slate-500" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenEdit(program)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Edit program"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenDeactivate(program)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Deactivate or Delete program"
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
