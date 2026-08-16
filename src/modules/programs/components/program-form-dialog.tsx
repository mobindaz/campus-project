"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProgramSchema, CreateProgramInput } from "../schemas";
import { createProgramAction, updateProgramAction } from "../actions";
import { X, BookOpen, AlertCircle, Loader2 } from "lucide-react";

export interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

export interface ProgramFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  departments: DepartmentOption[];
  programToEdit?: {
    id: string;
    name: string;
    code: string;
    shortName: string;
    type: "DEGREE" | "DIPLOMA" | "POST_GRADUATE" | "CERTIFICATE" | "DOCTORAL";
    durationYears: number;
    departmentId: string;
    isActive: boolean;
  } | null;
}

export function ProgramFormDialog({
  isOpen,
  onClose,
  onSuccess,
  departments,
  programToEdit,
}: ProgramFormDialogProps) {
  const isEditing = Boolean(programToEdit);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateProgramInput>({
    resolver: zodResolver(createProgramSchema),
    defaultValues: {
      name: "",
      code: "",
      shortName: "",
      type: "DEGREE",
      durationYears: 4,
      departmentId: departments[0]?.id || "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (programToEdit) {
      reset({
        name: programToEdit.name,
        code: programToEdit.code,
        shortName: programToEdit.shortName,
        type: programToEdit.type,
        durationYears: programToEdit.durationYears,
        departmentId: programToEdit.departmentId,
        isActive: programToEdit.isActive,
      });
    } else {
      reset({
        name: "",
        code: "",
        shortName: "",
        type: "DEGREE",
        durationYears: 4,
        departmentId: departments[0]?.id || "",
        isActive: true,
      });
    }
    setServerError(null);
  }, [programToEdit, isOpen, reset, departments]);

  if (!isOpen) return null;

  const onSubmit = async (data: CreateProgramInput) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      if (isEditing && programToEdit) {
        const result = await updateProgramAction(programToEdit.id, data);
        if (result.success) {
          onSuccess();
          onClose();
        } else {
          setServerError(result.error || "Failed to update program.");
        }
      } else {
        const result = await createProgramAction(data);
        if (result.success) {
          onSuccess();
          onClose();
        } else {
          setServerError(result.error || "Failed to create program.");
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
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {isEditing ? "Edit Academic Program" : "Create New Program"}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? "Update program parameters, department link, and duration"
                  : "Add a degree, diploma, or certificate program under a department"}
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
          {/* Department Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Department <span className="text-red-400">*</span>
            </label>
            <select
              {...register("departmentId")}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
            {errors.departmentId && (
              <p className="text-[11px] text-red-400">{errors.departmentId.message}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Program Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Bachelor of Technology in Computer Science"
              {...register("name")}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            />
            {errors.name && (
              <p className="text-[11px] text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Program Code <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. BTECH_CSE"
                {...register("code")}
                onChange={(e) => setValue("code", e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 uppercase placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
              />
              {errors.code && (
                <p className="text-[11px] text-red-400">{errors.code.message}</p>
              )}
            </div>

            {/* Short Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Short Name / Acronym <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. B.Tech CSE"
                {...register("shortName")}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
              />
              {errors.shortName && (
                <p className="text-[11px] text-red-400">{errors.shortName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Program Award Type <span className="text-red-400">*</span>
              </label>
              <select
                {...register("type")}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
              >
                <option value="DEGREE">Degree (Undergraduate)</option>
                <option value="DIPLOMA">Diploma</option>
                <option value="POST_GRADUATE">Post Graduate (Masters)</option>
                <option value="CERTIFICATE">Certificate</option>
                <option value="DOCTORAL">Doctoral / PhD</option>
              </select>
              {errors.type && (
                <p className="text-[11px] text-red-400">{errors.type.message}</p>
              )}
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Duration (Years) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={10}
                {...register("durationYears", { valueAsNumber: true })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
              />
              {errors.durationYears && (
                <p className="text-[11px] text-red-400">{errors.durationYears.message}</p>
              )}
            </div>
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
              Active Status (Enabled for student batch admissions & eligibility)
            </label>
          </div>

          {/* Actions */}
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
              <span>{isEditing ? "Save Changes" : "Create Program"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
