"use client";

import React, { useState } from "react";
import { DepartmentList, DepartmentItem } from "@/modules/departments/components/department-list";
import { DepartmentFormDialog } from "@/modules/departments/components/department-form-dialog";
import { DepartmentDeactivateDialog } from "@/modules/departments/components/department-deactivate-dialog";
import { getDepartmentsAction } from "@/modules/departments/actions";

export interface DepartmentClientWrapperProps {
  initialDepartments: DepartmentItem[];
}

export function DepartmentClientWrapper({ initialDepartments }: DepartmentClientWrapperProps) {
  const [departments, setDepartments] = useState<DepartmentItem[]>(initialDepartments);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentItem | null>(null);

  const handleRefresh = async () => {
    try {
      const res = await getDepartmentsAction({ includeInactive: true });
      if (res.success && res.data) {
        setDepartments(res.data as any);
      }
    } catch (err) {
      console.error("Failed to refresh departments:", err);
    }
  };

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
      <DepartmentList
        departments={departments}
        onOpenCreate={handleOpenCreate}
        onOpenEdit={handleOpenEdit}
        onOpenDeactivate={handleOpenDeactivate}
        onRefresh={handleRefresh}
      />

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
