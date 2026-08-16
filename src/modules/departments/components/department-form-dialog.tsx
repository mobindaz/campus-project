"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createDepartmentSchema,
  CreateDepartmentInput,
} from "../schemas";
import { createDepartmentAction, updateDepartmentAction } from "../actions";
import { X, Building2, AlertCircle, Loader2 } from "lucide-react";

export interface DepartmentFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  departmentToEdit?: {
    id: string;
    name: string;
    code: string;
    type: "ACADEMIC" | "ADMINISTRATIVE";
    description?: string | null;
    isActive: boolean;
  } | null;
}

export function DepartmentFormDialog({
  isOpen,
  onClose,
  onSuccess,
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
        isActive: departmentToEdit.isActive,
      });
    } else {
      reset({
        name: "",
        code: "",
        type: "ACADEMIC",
        description: "",
        isActive: true,
      });
    }
    setServerError(null);
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
    } catch (err: any) {
      setServerError("An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {isEditing ? "Edit Department" : "Create New Department"}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? "Update department parameters and status"
                  : "Add an academic department or administrative office"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Department Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Mechanical Engineering"
                {...register("name")}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
              />
              {errors.name && (
                <p className="text-[11px] text-red-400">{errors.name.message}</p>
              )}
            </div>

            {/* Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Code <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. MECH"
                {...register("code")}
                onChange={(e) => setValue("code", e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 uppercase placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
              />
              {errors.code && (
                <p className="text-[11px] text-red-400">{errors.code.message}</p>
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
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            >
              <option value="ACADEMIC">Academic Department (Teaches Students, Programs, Degrees)</option>
              <option value="ADMINISTRATIVE">Administrative Office (Finance, Placement, Admissions, Library)</option>
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
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 resize-none"
            />
            {errors.description && (
              <p className="text-[11px] text-red-400">{errors.description.message}</p>
            )}
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-3 pt-2">
            <input
              type="checkbox"
              id="isActive"
              {...register("isActive")}
              className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-slate-300 cursor-pointer">
              Active Status (Enabled for enrollment and clearance workflows)
            </label>
          </div>

          {/* Dialog Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition-colors shadow-lg shadow-indigo-600/20 flex items-center space-x-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isEditing ? "Save Changes" : "Create Department"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
