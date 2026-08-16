"use client";

import React, { useState } from "react";
import { ProgramList, ProgramItem } from "@/modules/programs/components/program-list";
import { ProgramFormDialog, DepartmentOption } from "@/modules/programs/components/program-form-dialog";
import { ProgramDeactivateDialog } from "@/modules/programs/components/program-deactivate-dialog";
import { getProgramsAction } from "@/modules/programs/actions";

export interface ProgramClientWrapperProps {
  initialPrograms: ProgramItem[];
  departments: DepartmentOption[];
}

export function ProgramClientWrapper({
  initialPrograms,
  departments,
}: ProgramClientWrapperProps) {
  const [programs, setPrograms] = useState<ProgramItem[]>(initialPrograms);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<ProgramItem | null>(null);

  const handleRefresh = async () => {
    try {
      const res = await getProgramsAction({ includeInactive: true });
      if (res.success && res.data) {
        setPrograms(res.data as any);
      }
    } catch (err) {
      console.error("Failed to refresh programs:", err);
    }
  };

  const handleOpenCreate = () => {
    setSelectedProgram(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (program: ProgramItem) => {
    setSelectedProgram(program);
    setIsFormOpen(true);
  };

  const handleOpenDeactivate = (program: ProgramItem) => {
    setSelectedProgram(program);
    setIsDeactivateOpen(true);
  };

  return (
    <div>
      <ProgramList
        programs={programs}
        departments={departments}
        onOpenCreate={handleOpenCreate}
        onOpenEdit={handleOpenEdit}
        onOpenDeactivate={handleOpenDeactivate}
        onRefresh={handleRefresh}
      />

      <ProgramFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleRefresh}
        departments={departments}
        programToEdit={selectedProgram}
      />

      <ProgramDeactivateDialog
        isOpen={isDeactivateOpen}
        onClose={() => setIsDeactivateOpen(false)}
        onSuccess={handleRefresh}
        program={selectedProgram}
      />
    </div>
  );
}
