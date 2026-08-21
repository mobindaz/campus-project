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
import type { DepartmentOption } from "./program-form-dialog";
export type { DepartmentOption };

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

export interface ProgramListProps {
  programs: ProgramItem[];
  departments?: DepartmentOption[];
  onOpenCreate: () => void;
  onOpenEdit: (program: ProgramItem) => void;
  onOpenDeactivate: (program: ProgramItem) => void;
  onRefresh: () => void;
}

export function ProgramList({
  programs,
  onOpenCreate,
  onOpenEdit,
  onOpenDeactivate,
  onRefresh,
}: ProgramListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [showInactive, setShowInactive] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filteredPrograms = programs.filter((program) => {
    if (!showInactive && !program.isActive) return false;
    if (typeFilter !== "ALL" && program.type !== typeFilter) return false;

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const matchName = program.name.toLowerCase().includes(term);
      const matchCode = program.code.toLowerCase().includes(term);
      const matchShort = program.shortName.toLowerCase().includes(term);
      const matchDept = program.departments?.some(
        (d) =>
          d.name.toLowerCase().includes(term) ||
          d.code.toLowerCase().includes(term)
      );
      return matchName || matchCode || matchShort || Boolean(matchDept);
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
          <span className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400">
            Degree
          </span>
        );
      case "DIPLOMA":
        return (
          <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
            Diploma
          </span>
        );
      case "POST_GRADUATE":
        return (
          <span className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-400">
            Post Graduate
          </span>
        );
      case "CERTIFICATE":
        return (
          <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
            Certificate
          </span>
        );
      case "DOCTORAL":
        return (
          <span className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-400">
            Doctoral
          </span>
        );
      default:
        return (
          <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls & Filter Bar */}
      <div className="flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md lg:flex-row lg:items-center">
        {/* Search Input */}
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by program name (e.g. B.Tech, Diploma, BCA)..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pr-4 pl-10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
          />
        </div>

        {/* Award Type Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
          >
            <option value="ALL">All Award Types</option>
            <option value="DEGREE">Degree</option>
            <option value="DIPLOMA">Diploma</option>
            <option value="POST_GRADUATE">Post Graduate</option>
            <option value="CERTIFICATE">Certificate</option>
            <option value="DOCTORAL">Doctoral</option>
          </select>

          {/* Inactive Toggle */}
          <label className="flex cursor-pointer items-center space-x-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Show Inactive</span>
          </label>

          {/* Add Program CTA */}
          <button
            type="button"
            onClick={onOpenCreate}
            className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold whitespace-nowrap text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            <span>Add Program</span>
          </button>
        </div>
      </div>

      {/* Table Data Grid */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-md">
        {filteredPrograms.length === 0 ? (
          <div className="space-y-3 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">
              No programs found
            </h3>
            <p className="mx-auto max-w-sm text-xs text-slate-400">
              No academic programs match your selected search or filter
              criteria.
            </p>
            <button
              type="button"
              onClick={onOpenCreate}
              className="mt-2 inline-flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              <span>Create Program</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  <th className="px-4 py-3.5">Program Name & Code</th>
                  <th className="px-4 py-3.5">Departments / Branches</th>
                  <th className="px-4 py-3.5">Award Type</th>
                  <th className="px-4 py-3.5">Duration</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredPrograms.map((program) => (
                  <tr
                    key={program.id}
                    className="group transition-colors hover:bg-slate-800/40"
                  >
                    {/* Program Name & Code */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-3">
                        <div className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 font-mono text-xs font-bold text-indigo-400">
                          {program.code}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-100 transition-colors group-hover:text-indigo-300">
                            {program.name}
                          </p>
                          <p className="text-xs font-medium text-slate-400">
                            Short:{" "}
                            <span className="text-slate-300">
                              {program.shortName}
                            </span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Departments / Branches */}
                    <td className="px-4 py-3.5">
                      {program.departments && program.departments.length > 0 ? (
                        <div className="flex max-w-xs flex-wrap gap-1.5">
                          {program.departments.map((dept) => (
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
                      )}
                    </td>

                    {/* Award Type */}
                    <td className="px-4 py-3.5">
                      {renderTypeBadge(program.type)}
                    </td>

                    {/* Duration */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center space-x-1 text-xs font-medium text-slate-300">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        <span>
                          {program.durationYears}{" "}
                          {program.durationYears === 1 ? "Year" : "Years"}
                        </span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      {program.isActive ? (
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
                          onClick={() => handleToggleStatus(program)}
                          disabled={togglingId === program.id}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-indigo-400"
                          title={
                            program.isActive
                              ? "Deactivate program"
                              : "Activate program"
                          }
                        >
                          {program.isActive ? (
                            <ToggleRight className="h-5 w-5 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-slate-500" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenEdit(program)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                          title="Edit program"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenDeactivate(program)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-amber-400"
                          title="Deactivate or Delete program"
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
