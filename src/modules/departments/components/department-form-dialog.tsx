"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createDepartmentSchema, CreateDepartmentInput } from "../schemas";
import { createDepartmentAction, updateDepartmentAction } from "../actions";
import { X, Building2, AlertCircle, Loader2 } from "lucide-react";

export interface ProgramOption {
  id: string;
  name: string;
  code: string;
}

export interface DepartmentFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  programs?: ProgramOption[];
  departmentToEdit?: {
    id: string;
    name: string;
    code: string;
    type: "ACADEMIC" | "ADMINISTRATIVE";
    description?: string | null;
    programId?: string | null;
    isActive: boolean;
  } | null;
}

export function DepartmentFormDialog({
  isOpen,
  onClose,
  onSuccess,
  programs = [],
  departmentToEdit,
}: DepartmentFormDialogProps) {
  const isEditing = Boolean(departmentToEdit);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateDepartmentInput>({
    resolver: zodResolver(createDepartmentSchema),
    defaultValues: {
      name: "",
      code: "",
      type: "ACADEMIC",
      description: "",
      programId: null,
      isActive: true,
    },
  });

  useEffect(() => {
    if (departmentToEdit) {
      reset({
        name: departmentToEdit.name,
        code: departmentToEdit.code,
        type: departmentToEdit.type,
        description: departmentToEdit.description || "",
        programId: departmentToEdit.programId || null,
        isActive: departmentToEdit.isActive,
      });
    } else {
      reset({
        name: "",
        code: "",
        type: "ACADEMIC",
        description: "",
        programId: null,
        isActive: true,
      });
    }
  }, [departmentToEdit, isOpen, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: CreateDepartmentInput) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      if (isEditing && departmentToEdit) {
        const result = await updateDepartmentAction(departmentToEdit.id, data);
        if (result.success) {
          onSuccess();
          onClose();
        } else {
          setServerError(result.error || "Failed to update department.");
        }
      } else {
        const result = await createDepartmentAction(data);
        if (result.success) {
          onSuccess();
          onClose();
        } else {
          setServerError(result.error || "Failed to create department.");
        }
      }
    } catch {
      setServerError("An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm duration-200">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-2 text-indigo-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {isEditing ? "Edit Department" : "Create New Department"}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? "Update department parameters, parent program, and status"
                  : "Add a branch/specialization under a Program or administrative office"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="mx-6 mt-4 flex items-start space-x-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          {/* Parent Program Selection (Optional) */}
          {programs.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Parent Program{" "}
                <span className="text-slate-500">(Optional)</span>
              </label>
              <select
                {...register("programId")}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
              >
                <option value="">
                  None (Independent / General Department)
                </option>
                {programs.map((prog) => (
                  <option key={prog.id} value={prog.id}>
                    {prog.name} ({prog.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Department Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Computer Science & Engineering"
                {...register("name")}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
              />
              {errors.name && (
                <p className="text-[11px] text-red-400">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Code <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. CSE"
                {...register("code")}
                onChange={(e) => setValue("code", e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 uppercase placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
              />
              {errors.code && (
                <p className="text-[11px] text-red-400">
                  {errors.code.message}
                </p>
              )}
            </div>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Department Type <span className="text-red-400">*</span>
            </label>
            <select
              {...register("type")}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
            >
              <option value="ACADEMIC">Academic Branch / Specialization</option>
              <option value="ADMINISTRATIVE">
                Administrative Office (Finance, Placement, Admissions, Library)
              </option>
            </select>
            {errors.type && (
              <p className="text-[11px] text-red-400">{errors.type.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Description <span className="text-slate-500">(Optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Brief description of the department..."
              {...register("description")}
              className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
            />
            {errors.description && (
              <p className="text-[11px] text-red-400">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-3 pt-2">
            <input
              type="checkbox"
              id="isActive"
              {...register("isActive")}
              className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
            />
            <label
              htmlFor="isActive"
              className="cursor-pointer text-sm font-medium text-slate-300"
            >
              Active Status (Enabled for enrollment and clearance workflows)
            </label>
          </div>

          {/* Dialog Actions */}
          <div className="flex items-center justify-end space-x-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{isEditing ? "Save Changes" : "Create Department"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
