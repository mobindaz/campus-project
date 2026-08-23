"use client";

import React, { useState, useCallback } from "react";
import {
  DepartmentList,
  DepartmentItem,
} from "@/modules/departments/components/department-list";
import { DepartmentFormDialog } from "@/modules/departments/components/department-form-dialog";
import { DepartmentDeactivateDialog } from "@/modules/departments/components/department-deactivate-dialog";

export interface DepartmentClientWrapperProps {
  permissions: string[];
}

export function DepartmentClientWrapper({
  permissions,
}: DepartmentClientWrapperProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] =
    useState<DepartmentItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    // Increment key to force DataTable to re-fetch
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleOpenCreate = () => {
    setSelectedDepartment(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (dept: DepartmentItem) => {
    setSelectedDepartment(dept);
    setIsFormOpen(true);
  };

  const handleOpenDeactivate = (dept: DepartmentItem) => {
    setSelectedDepartment(dept);
    setIsDeactivateOpen(true);
  };

  return (
    <div>
      <div key={refreshKey}>
        <DepartmentList
          permissions={permissions}
          onOpenCreate={handleOpenCreate}
          onOpenEdit={handleOpenEdit}
          onOpenDeactivate={handleOpenDeactivate}
          onRefresh={handleRefresh}
        />
      </div>

      <DepartmentFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleRefresh}
        departmentToEdit={selectedDepartment}
      />

      <DepartmentDeactivateDialog
        isOpen={isDeactivateOpen}
        onClose={() => setIsDeactivateOpen(false)}
        onSuccess={handleRefresh}
        department={selectedDepartment}
      />
    </div>
  );
}
