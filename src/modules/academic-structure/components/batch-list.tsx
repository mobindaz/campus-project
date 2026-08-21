"use client";

import React, { useState } from "react";
import {
  Calendar,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  BookOpen,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { updateBatchAction } from "../actions";
import { ProgramOption } from "./period-manager";

export interface BatchItem {
  id: string;
  name: string;
  code: string;
  academicYear: string;
  admissionYear: number;
  graduationYear: number;
  section?: string | null;
  programId: string;
  departmentId?: string | null;
  program?: {
    id: string;
    name: string;
    code: string;
    departments?: {
      id: string;
      name: string;
      code: string;
    }[];
  } | null;
  department?: {
    id: string;
    name: string;
    code: string;
  } | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface BatchListProps {
  batches: BatchItem[];
  programs: ProgramOption[];
  onOpenCreate: () => void;
  onOpenEdit: (batch: BatchItem) => void;
  onOpenDeactivate: (batch: BatchItem) => void;
  onRefresh: () => void;
}

export function BatchList({
  batches,
  programs,
  onOpenCreate,
  onOpenEdit,
  onOpenDeactivate,
  onRefresh,
}: BatchListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState<string>("ALL");
  const [showInactive, setShowInactive] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filteredBatches = batches.filter((batch) => {
    if (!showInactive && !batch.isActive) return false;
    if (selectedProgramId !== "ALL" && batch.programId !== selectedProgramId)
      return false;

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const matchName = batch.name.toLowerCase().includes(term);
      const matchCode = batch.code.toLowerCase().includes(term);
      const matchYear = batch.academicYear.toLowerCase().includes(term);
      const matchSec = batch.section?.toLowerCase().includes(term) || false;
      const matchProg =
        batch.program?.name.toLowerCase().includes(term) || false;
      return matchName || matchCode || matchYear || matchSec || matchProg;
    }
    return true;
  });

  const handleToggleStatus = async (batch: BatchItem) => {
    setTogglingId(batch.id);
    try {
      await updateBatchAction(batch.id, { isActive: !batch.isActive });
      onRefresh();
    } catch (error) {
      console.error("Failed to toggle batch status", error);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md lg:flex-row lg:items-center">
        {/* Search Input */}
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by batch name, code, academic year, or section..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pr-4 pl-10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
          />
        </div>

        {/* Program Filter & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="hidden h-4 w-4 text-indigo-400 sm:inline" />
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="max-w-[200px] truncate rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
            >
              <option value="ALL">All Programs ({programs.length})</option>
              {programs.map((prog) => (
                <option key={prog.id} value={prog.id}>
                  {prog.name} ({prog.code})
                </option>
              ))}
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
            <span>Create Batch</span>
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-md">
        {filteredBatches.length === 0 ? (
          <div className="space-y-3 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">
              No batches found
            </h3>
            <p className="mx-auto max-w-sm text-xs text-slate-400">
              No student batches match your current program or search query.
            </p>
            <button
              type="button"
              onClick={onOpenCreate}
              className="mt-2 inline-flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              <span>Create Batch</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  <th className="px-4 py-3.5">Batch Name & Code</th>
                  <th className="px-4 py-3.5">Program</th>
                  <th className="px-4 py-3.5">Academic Year</th>
                  <th className="px-4 py-3.5">Admission - Graduation</th>
                  <th className="px-4 py-3.5">Section</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredBatches.map((batch) => (
                  <tr
                    key={batch.id}
                    className="group transition-colors hover:bg-slate-800/40"
                  >
                    {/* Name & Code */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-3">
                        <div className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 font-mono text-xs font-bold text-indigo-400">
                          {batch.code}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-100 transition-colors group-hover:text-indigo-300">
                            {batch.name}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Program */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                        <span className="text-xs font-medium text-slate-200">
                          {batch.program
                            ? `${batch.program.name} (${batch.program.code})`
                            : "Standalone"}
                        </span>
                      </div>
                    </td>

                    {/* Academic Year */}
                    <td className="px-4 py-3.5">
                      <span className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs font-semibold text-slate-300">
                        {batch.academicYear}
                      </span>
                    </td>

                    {/* Admission - Graduation */}
                    <td className="px-4 py-3.5 text-xs font-medium text-slate-400">
                      {batch.admissionYear} — {batch.graduationYear}
                    </td>

                    {/* Section */}
                    <td className="px-4 py-3.5">
                      {batch.section ? (
                        <span className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-xs font-bold text-indigo-400">
                          Sec {batch.section}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600 italic">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      {batch.isActive ? (
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
                          onClick={() => handleToggleStatus(batch)}
                          disabled={togglingId === batch.id}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-indigo-400"
                          title={
                            batch.isActive
                              ? "Deactivate batch"
                              : "Activate batch"
                          }
                        >
                          {batch.isActive ? (
                            <ToggleRight className="h-5 w-5 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-slate-600" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenEdit(batch)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                          title="Edit batch"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenDeactivate(batch)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-amber-400"
                          title="Deactivate or Delete batch"
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
