import React from "react";
import { requireAuth } from "@/server/services/auth.service";
import { listProgramsService } from "@/server/services/program.service";
import { listBatchesService } from "@/server/services/batch.service";
import { AcademicStructureClientWrapper } from "./client-wrapper";
import { Calendar, GitFork, BookOpen, Layers } from "lucide-react";

import { ProgramOption } from "@/modules/academic-structure/components/period-manager";
import { BatchItem } from "@/modules/academic-structure/components/batch-list";

export default async function AcademicStructurePage() {
  const session = await requireAuth({ redirectTo: "/academic-structure" });

  let programs: ProgramOption[] = [];
  let batches: BatchItem[] = [];

  try {
    const [progs, bts] = await Promise.all([
      listProgramsService(session.user, { includeInactive: false }),
      listBatchesService(session.user, { includeInactive: true }),
    ]);
    programs = progs;
    batches = bts;
  } catch (error) {
    console.error("Failed to load academic structure data:", error);
  }

  const activeBatches = batches.filter((b) => b.isActive).length;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      {/* Page Title & Context Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center space-x-3">
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-2.5 text-indigo-400">
              <GitFork className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-100">
                Academic Structure & Batches
              </h1>
              <p className="mt-0.5 text-xs text-slate-400">
                Configure program periods (Semesters/Years/Terms) and student
                admission batches
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center space-x-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-indigo-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Active Programs
            </p>
            <p className="mt-0.5 text-2xl font-black text-slate-100">
              {programs.length}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Total Batches
            </p>
            <p className="mt-0.5 text-2xl font-black text-slate-100">
              {batches.length}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-cyan-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Active Batches
            </p>
            <p className="mt-0.5 text-2xl font-black text-slate-100">
              {activeBatches}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 text-purple-400">
            <GitFork className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Period Patterns
            </p>
            <p className="mt-0.5 text-2xl font-black text-slate-100">Dynamic</p>
          </div>
        </div>
      </div>

      {/* Interactive Tabs Client Component */}
      <AcademicStructureClientWrapper
        programs={programs}
        initialBatches={batches}
      />
    </div>
  );
}
