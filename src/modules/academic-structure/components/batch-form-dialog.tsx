"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBatchSchema, CreateBatchInput } from "../schemas";
import { createBatchAction, updateBatchAction } from "../actions";
import { X, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { ProgramOption } from "./period-manager";

export interface BatchFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  programs: ProgramOption[];
  batchToEdit?: {
    id: string;
    name: string;
    code: string;
    academicYear: string;
    admissionYear: number;
    graduationYear: number;
    section?: string | null;
    programId: string;
    isActive: boolean;
  } | null;
}

export function BatchFormDialog({
  isOpen,
  onClose,
  onSuccess,
  programs,
  batchToEdit,
}: BatchFormDialogProps) {
  const isEditing = Boolean(batchToEdit);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateBatchInput>({
    resolver: zodResolver(createBatchSchema),
    defaultValues: {
      name: "",
      code: "",
      academicYear: "2024-2028",
      admissionYear: 2024,
      graduationYear: 2028,
      section: "A",
      programId: programs[0]?.id || "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (batchToEdit) {
      reset({
        name: batchToEdit.name,
        code: batchToEdit.code,
        academicYear: batchToEdit.academicYear,
        admissionYear: batchToEdit.admissionYear,
        graduationYear: batchToEdit.graduationYear,
        section: batchToEdit.section || "",
        programId: batchToEdit.programId,
        isActive: batchToEdit.isActive,
      });
    } else {
      reset({
        name: "",
        code: "",
        academicYear: "2024-2028",
        admissionYear: 2024,
        graduationYear: 2028,
        section: "A",
        programId: programs[0]?.id || "",
        isActive: true,
      });
    }
  }, [batchToEdit, isOpen, reset, programs]);

  if (!isOpen) return null;

  const onSubmit = async (data: CreateBatchInput) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      if (isEditing && batchToEdit) {
        const result = await updateBatchAction(batchToEdit.id, data);
        if (result.success) {
          onSuccess();
          onClose();
        } else {
          setServerError(result.error || "Failed to update batch.");
        }
      } else {
        const result = await createBatchAction(data);
        if (result.success) {
          onSuccess();
          onClose();
        } else {
          setServerError(result.error || "Failed to create batch.");
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
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {isEditing ? "Edit Student Batch" : "Create New Batch"}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? "Update batch academic year, section, and program association"
                  : "Add an academic batch (e.g., 2024-2028 Section A) under a program"}
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
          {/* Program Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Program <span className="text-red-400">*</span>
            </label>
            <select
              {...register("programId")}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
            >
              {programs.map((prog) => (
                <option key={prog.id} value={prog.id}>
                  {prog.name} ({prog.code})
                </option>
              ))}
            </select>
            {errors.programId && (
              <p className="text-[11px] text-red-400">
                {errors.programId.message}
              </p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Batch Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 2024-2028 Batch A"
              {...register("name")}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
            />
            {errors.name && (
              <p className="text-[11px] text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Batch Code <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. B2024_A"
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

            {/* Academic Year String */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Academic Year <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 2024-2028"
                {...register("academicYear")}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
              />
              {errors.academicYear && (
                <p className="text-[11px] text-red-400">
                  {errors.academicYear.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {/* Admission Year */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Admission Year <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                {...register("admissionYear", { valueAsNumber: true })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
              />
              {errors.admissionYear && (
                <p className="text-[11px] text-red-400">
                  {errors.admissionYear.message}
                </p>
              )}
            </div>

            {/* Graduation Year */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Graduation Year <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                {...register("graduationYear", { valueAsNumber: true })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
              />
              {errors.graduationYear && (
                <p className="text-[11px] text-red-400">
                  {errors.graduationYear.message}
                </p>
              )}
            </div>

            {/* Section */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Section <span className="text-slate-500">(Opt)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. A"
                {...register("section")}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-100 uppercase focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
              />
              {errors.section && (
                <p className="text-[11px] text-red-400">
                  {errors.section.message}
                </p>
              )}
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-3 pt-2">
            <input
              type="checkbox"
              id="isActiveBatch"
              {...register("isActive")}
              className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
            />
            <label
              htmlFor="isActiveBatch"
              className="cursor-pointer text-sm font-medium text-slate-300"
            >
              Active Status (Enabled for student admissions & placement drives)
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
              <span>{isEditing ? "Save Changes" : "Create Batch"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
