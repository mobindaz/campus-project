"use client";

import React, { useState, useCallback } from "react";
import {
  ProgramList,
  ProgramItem,
} from "@/modules/programs/components/program-list";
import {
  ProgramFormDialog,
  DepartmentOption,
} from "@/modules/programs/components/program-form-dialog";
import { ProgramDeactivateDialog } from "@/modules/programs/components/program-deactivate-dialog";

export interface ProgramClientWrapperProps {
  permissions: string[];
  departments: DepartmentOption[];
}

export function ProgramClientWrapper({
  permissions,
  departments,
}: ProgramClientWrapperProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<ProgramItem | null>(
    null
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

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
      <div key={refreshKey}>
        <ProgramList
          permissions={permissions}
          departments={departments}
          onOpenCreate={handleOpenCreate}
          onOpenEdit={handleOpenEdit}
          onOpenDeactivate={handleOpenDeactivate}
          onRefresh={handleRefresh}
        />
      </div>

      <ProgramFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleRefresh}
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
