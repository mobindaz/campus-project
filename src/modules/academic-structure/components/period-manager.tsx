"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowUp,
  ArrowDown,
  Plus,
  Wand2,
  Edit2,
  Trash2,
  Check,
  X,
  BookOpen,
  Calendar,
  Layers,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  createAcademicPeriodAction,
  deleteAcademicPeriodAction,
  generateDefaultPeriodsAction,
  getAcademicPeriodsAction,
  reorderAcademicPeriodsAction,
  updateAcademicPeriodAction,
} from "../actions";

export interface ProgramOption {
  id: string;
  name: string;
  code: string;
  shortName: string;
}

export interface AcademicPeriodItem {
  id: string;
  name: string;
  code: string;
  pattern: "SEMESTER" | "YEAR" | "TERM" | "TRIMESTER" | "CUSTOM";
  orderIndex: number;
  programId: string;
  isActive: boolean;
}

export interface PeriodManagerProps {
  programs: ProgramOption[];
  initialProgramId?: string;
}

export function PeriodManager({
  programs,
  initialProgramId,
}: PeriodManagerProps) {
  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    initialProgramId || programs[0]?.id || ""
  );
  const [periods, setPeriods] = useState<AcademicPeriodItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [generatorPattern, setGeneratorPattern] = useState<string>("SEMESTER");
  const [generatorCount, setGeneratorCount] = useState<number>(6);

  // Single creation state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPeriodName, setNewPeriodName] = useState("");
  const [newPeriodCode, setNewPeriodCode] = useState("");
  const [newPeriodPattern, setNewPeriodPattern] = useState<string>("SEMESTER");

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");

  const loadPeriods = React.useCallback(async (programId: string) => {
    if (!programId) return;
    setIsLoading(true);
    try {
      const res = await getAcademicPeriodsAction(programId, true);
      if (res.success && res.data) {
        setPeriods(res.data as AcademicPeriodItem[]);
      }
    } catch (err) {
      console.error("Failed to load academic periods", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedProgramId) return;
    let active = true;

    const runFetch = async () => {
      setIsLoading(true);
      try {
        const res = await getAcademicPeriodsAction(selectedProgramId, true);
        if (active && res.success && res.data) {
          setPeriods(res.data as AcademicPeriodItem[]);
        }
      } catch (err) {
        console.error("Failed to load academic periods", err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    queueMicrotask(() => {
      if (active) {
        runFetch();
      }
    });

    return () => {
      active = false;
    };
  }, [selectedProgramId]);

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= periods.length) return;

    const newPeriods = [...periods];
    const [moved] = newPeriods.splice(index, 1);
    newPeriods.splice(targetIndex, 0, moved);

    // Optimistic UI update
    const reorderedOptimistic = newPeriods.map((p, idx) => ({
      ...p,
      orderIndex: idx + 1,
    }));
    setPeriods(reorderedOptimistic);

    const orderedIds = reorderedOptimistic.map((p) => p.id);
    await reorderAcademicPeriodsAction({
      programId: selectedProgramId,
      orderedIds,
    });
  };

  const handleToggleStatus = async (period: AcademicPeriodItem) => {
    try {
      await updateAcademicPeriodAction(period.id, {
        isActive: !period.isActive,
      });
      loadPeriods(selectedProgramId);
    } catch (err) {
      console.error("Failed to toggle period status", err);
    }
  };

  const handleBulkGenerate = async () => {
    if (!selectedProgramId) return;
    setIsGenerating(true);
    try {
      const res = await generateDefaultPeriodsAction({
        programId: selectedProgramId,
        pattern: generatorPattern as AcademicPeriodItem["pattern"],
        count: Number(generatorCount),
      });
      if (res.success) {
        setShowGeneratorModal(false);
        loadPeriods(selectedProgramId);
      }
    } catch (err) {
      console.error("Failed to bulk generate periods", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateSingle = async () => {
    if (!newPeriodName || !newPeriodCode || !selectedProgramId) return;
    try {
      const res = await createAcademicPeriodAction({
        name: newPeriodName,
        code: newPeriodCode,
        pattern: newPeriodPattern as AcademicPeriodItem["pattern"],
        orderIndex: periods.length + 1,
        programId: selectedProgramId,
        isActive: true,
      });
      if (res.success) {
        setShowAddModal(false);
        setNewPeriodName("");
        setNewPeriodCode("");
        loadPeriods(selectedProgramId);
      }
    } catch (err) {
      console.error("Failed to create single period", err);
    }
  };

  const handleStartEdit = (period: AcademicPeriodItem) => {
    setEditingId(period.id);
    setEditName(period.name);
    setEditCode(period.code);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateAcademicPeriodAction(id, {
        name: editName,
        code: editCode,
      });
      setEditingId(null);
      loadPeriods(selectedProgramId);
    } catch (err) {
      console.error("Failed to update period", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAcademicPeriodAction(id);
      loadPeriods(selectedProgramId);
    } catch (err) {
      console.error("Failed to delete period", err);
    }
  };

  const selectedProgram = programs.find((p) => p.id === selectedProgramId);

  return (
    <div className="space-y-6">
      {/* Program Selection Header */}
      <div className="flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md sm:flex-row sm:items-center">
        <div className="flex items-center space-x-3">
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-2.5 text-indigo-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400">
              Select Program
            </label>
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="mt-0.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-sm font-semibold text-slate-100 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
            >
              {programs.map((prog) => (
                <option key={prog.id} value={prog.id}>
                  {prog.name} ({prog.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setShowGeneratorModal(true)}
            className="flex items-center space-x-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/15 px-3.5 py-2 text-xs font-semibold text-indigo-300 transition-all hover:bg-indigo-500/25"
          >
            <Wand2 className="h-4 w-4" />
            <span>Bulk Generate Periods</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            <span>Add Period</span>
          </button>
        </div>
      </div>

      {/* Program Period Count Badge Notice */}
      {selectedProgram && (
        <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-indigo-400" />
            <span>
              Configured Structure for{" "}
              <strong className="text-slate-200">{selectedProgram.name}</strong>
              :
            </span>
          </div>
          <span className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 font-semibold text-indigo-400">
            {periods.length} {periods.length === 1 ? "Period" : "Periods"}{" "}
            Configured
          </span>
        </div>
      )}

      {/* Reorderable Academic Periods List */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-md">
        {isLoading ? (
          <div className="space-y-2 p-12 text-center text-slate-400">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-400" />
            <p className="text-xs">Loading academic periods...</p>
          </div>
        ) : periods.length === 0 ? (
          <div className="space-y-3 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">
              No academic periods configured
            </h3>
            <p className="mx-auto max-w-sm text-xs text-slate-400">
              This program currently has zero configured semesters, years, or
              terms. Use the bulk generator to configure e.g. 6 Semesters or 3
              Years instantly.
            </p>
            <button
              type="button"
              onClick={() => setShowGeneratorModal(true)}
              className="mt-2 inline-flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              <Wand2 className="h-4 w-4" />
              <span>Bulk Generate Periods</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {periods.map((period, idx) => (
              <div
                key={period.id}
                className="group flex items-center justify-between p-4 transition-colors hover:bg-slate-800/40"
              >
                {/* Reorder Position & Info */}
                <div className="flex items-center space-x-4">
                  {/* Up/Down Controls */}
                  <div className="flex flex-col space-y-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, "up")}
                      className="p-1 text-slate-500 transition-colors hover:text-indigo-400 disabled:opacity-20"
                      title="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === periods.length - 1}
                      onClick={() => handleMove(idx, "down")}
                      className="p-1 text-slate-500 transition-colors hover:text-indigo-400 disabled:opacity-20"
                      title="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Order Badge */}
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs font-bold text-indigo-400">
                    #{period.orderIndex}
                  </div>

                  {/* Period Name / Editing */}
                  {editingId === period.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        placeholder="Period Name"
                      />
                      <input
                        type="text"
                        value={editCode}
                        onChange={(e) =>
                          setEditCode(e.target.value.toUpperCase())
                        }
                        className="w-24 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-xs text-slate-100 uppercase focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        placeholder="Code"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(period.id)}
                        className="rounded-lg p-1 text-emerald-400 hover:bg-emerald-500/10"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-100">
                          {period.name}
                        </span>
                        <span className="rounded-md border border-slate-800 bg-slate-950 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-400">
                          {period.code}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                        Pattern: {period.pattern}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Actions */}
                <div className="flex items-center space-x-3">
                  {/* Active Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(period)}
                    className="rounded-lg p-1 text-slate-400 hover:text-indigo-400"
                    title={
                      period.isActive ? "Deactivate period" : "Activate period"
                    }
                  >
                    {period.isActive ? (
                      <ToggleRight className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-slate-600" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartEdit(period)}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                    title="Rename / Edit code"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(period.id)}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-amber-400"
                    title="Delete period"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Generator Modal */}
      {showGeneratorModal && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm duration-200">
          <div className="w-full max-w-md space-y-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 font-bold text-indigo-400">
                <Wand2 className="h-5 w-5" />
                <span>Bulk Period Generator</span>
              </div>
              <button
                type="button"
                onClick={() => setShowGeneratorModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Automatically generate sequential academic periods for{" "}
              <strong className="text-slate-200">
                {selectedProgram?.name}
              </strong>
              .
            </p>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Period Pattern
                </label>
                <select
                  value={generatorPattern}
                  onChange={(e) => setGeneratorPattern(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                >
                  <option value="SEMESTER">
                    Semesters (e.g. Semester 1, Semester 2...)
                  </option>
                  <option value="YEAR">
                    Years (e.g. Year 1, Year 2, Year 3...)
                  </option>
                  <option value="TERM">Terms (e.g. Term 1, Term 2...)</option>
                  <option value="TRIMESTER">
                    Trimesters (e.g. Trimester 1, Trimester 2...)
                  </option>
                  <option value="CUSTOM">
                    Custom Periods (e.g. Period 1, Period 2...)
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Number of Periods to Generate
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={generatorCount}
                  onChange={(e) => setGeneratorCount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setShowGeneratorModal(false)}
                className="rounded-xl bg-slate-800/50 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleBulkGenerate}
                className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                {isGenerating && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                <span>Generate Periods</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Single Period Modal */}
      {showAddModal && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm duration-200">
          <div className="w-full max-w-md space-y-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 font-bold text-indigo-400">
                <Plus className="h-5 w-5" />
                <span>Add Single Period</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Period Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Semester 7 or Internship Term"
                  value={newPeriodName}
                  onChange={(e) => setNewPeriodName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Period Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. SEM_7"
                  value={newPeriodCode}
                  onChange={(e) =>
                    setNewPeriodCode(e.target.value.toUpperCase())
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 uppercase"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Pattern
                </label>
                <select
                  value={newPeriodPattern}
                  onChange={(e) => setNewPeriodPattern(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                >
                  <option value="SEMESTER">Semester</option>
                  <option value="YEAR">Year</option>
                  <option value="TERM">Term</option>
                  <option value="TRIMESTER">Trimester</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl bg-slate-800/50 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateSingle}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Save Period
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
