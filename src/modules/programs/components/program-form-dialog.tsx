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
  programToEdit?: {
    id: string;
    name: string;
    code: string;
    shortName: string;
    type: "DEGREE" | "DIPLOMA" | "POST_GRADUATE" | "CERTIFICATE" | "DOCTORAL";
    durationYears: number;
    isActive: boolean;
  } | null;
}

export function ProgramFormDialog({
  isOpen,
  onClose,
  onSuccess,
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
        isActive: programToEdit.isActive,
      });
    } else {
      reset({
        name: "",
        code: "",
        shortName: "",
        type: "DEGREE",
        durationYears: 4,
        isActive: true,
      });
    }
  }, [programToEdit, isOpen, reset]);

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
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {isEditing ? "Edit Academic Program" : "Create New Program"}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? "Update program parameters, degree type, and duration"
                  : "Add a degree, diploma, or certificate program (e.g. B.Tech, Diploma, BCA)"}
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
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Program Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Bachelor of Technology in Computer Science"
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
                Program Code <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. BTECH_CSE"
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

            {/* Short Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Short Name / Acronym <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. B.Tech CSE"
                {...register("shortName")}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
              />
              {errors.shortName && (
                <p className="text-[11px] text-red-400">
                  {errors.shortName.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Program Award Type <span className="text-red-400">*</span>
              </label>
              <select
                {...register("type")}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
              >
                <option value="DEGREE">Degree (Undergraduate)</option>
                <option value="DIPLOMA">Diploma</option>
                <option value="POST_GRADUATE">Post Graduate (Masters)</option>
                <option value="CERTIFICATE">Certificate</option>
                <option value="DOCTORAL">Doctoral / PhD</option>
              </select>
              {errors.type && (
                <p className="text-[11px] text-red-400">
                  {errors.type.message}
                </p>
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
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
              />
              {errors.durationYears && (
                <p className="text-[11px] text-red-400">
                  {errors.durationYears.message}
                </p>
              )}
            </div>
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
              Active Status (Enabled for student batch admissions & eligibility)
            </label>
          </div>

          {/* Actions */}
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
              <span>{isEditing ? "Save Changes" : "Create Program"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
