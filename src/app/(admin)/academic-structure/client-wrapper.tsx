"use client";

import React, { useState } from "react";
import {
  PeriodManager,
  ProgramOption,
} from "@/modules/academic-structure/components/period-manager";
import {
  BatchList,
  BatchItem,
} from "@/modules/academic-structure/components/batch-list";
import { BatchFormDialog } from "@/modules/academic-structure/components/batch-form-dialog";
import { BatchDeactivateDialog } from "@/modules/academic-structure/components/batch-deactivate-dialog";
import { getBatchesAction } from "@/modules/academic-structure/actions";
import { Layers, Calendar } from "lucide-react";

export interface AcademicStructureClientWrapperProps {
  programs: ProgramOption[];
  initialBatches: BatchItem[];
}

export function AcademicStructureClientWrapper({
  programs,
  initialBatches,
}: AcademicStructureClientWrapperProps) {
  const [activeTab, setActiveTab] = useState<"PERIODS" | "BATCHES">("PERIODS");

  const [batches, setBatches] = useState<BatchItem[]>(initialBatches);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchItem | null>(null);

  const handleRefreshBatches = async () => {
    try {
      const res = await getBatchesAction({ includeInactive: true });
      if (res.success && res.data) {
        setBatches(res.data as BatchItem[]);
      }
    } catch (err) {
      console.error("Failed to refresh batches:", err);
    }
  };

  const handleOpenCreateBatch = () => {
    setSelectedBatch(null);
    setIsFormOpen(true);
  };

  const handleOpenEditBatch = (batch: BatchItem) => {
    setSelectedBatch(batch);
    setIsFormOpen(true);
  };

  const handleOpenDeactivateBatch = (batch: BatchItem) => {
    setSelectedBatch(batch);
    setIsDeactivateOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("PERIODS")}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
            activeTab === "PERIODS"
              ? "border border-indigo-500/30 bg-indigo-600/15 font-bold text-indigo-400"
              : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Academic Periods Configuration</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("BATCHES")}
          className={`flex items-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
            activeTab === "BATCHES"
              ? "border border-indigo-500/30 bg-indigo-600/15 font-bold text-indigo-400"
              : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Student Batches ({batches.length})</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "PERIODS" ? (
        <PeriodManager programs={programs} />
      ) : (
        <div>
          <BatchList
            batches={batches}
            programs={programs}
            onOpenCreate={handleOpenCreateBatch}
            onOpenEdit={handleOpenEditBatch}
            onOpenDeactivate={handleOpenDeactivateBatch}
            onRefresh={handleRefreshBatches}
          />

          <BatchFormDialog
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSuccess={handleRefreshBatches}
            programs={programs}
            batchToEdit={selectedBatch}
          />

          <BatchDeactivateDialog
            isOpen={isDeactivateOpen}
            onClose={() => setIsDeactivateOpen(false)}
            onSuccess={handleRefreshBatches}
            batch={selectedBatch}
          />
        </div>
      )}
    </div>
  );
}
