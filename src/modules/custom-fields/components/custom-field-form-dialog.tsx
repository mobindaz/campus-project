"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCustomFieldDefinitionSchema } from "../schemas";
import { createCustomFieldAction, updateCustomFieldAction } from "../actions";
import {
  CUSTOM_FIELD_TYPES,
  CustomFieldDefinitionDto,
  CustomFieldVisibility,
} from "../types";
import { X, Sliders, AlertCircle, Loader2, Plus } from "lucide-react";

export interface CustomFieldFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entityType: string;
  fieldToEdit?: CustomFieldDefinitionDto | null;
}

export function CustomFieldFormDialog({
  isOpen,
  onClose,
  onSuccess,
  entityType,
  fieldToEdit,
}: CustomFieldFormDialogProps) {
  const isEditing = Boolean(fieldToEdit);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<any>({
    resolver: zodResolver(createCustomFieldDefinitionSchema),
    defaultValues: {
      entityType,
      name: "",
      label: "",
      type: "TEXT",
      required: false,
      unique: false,
      defaultValue: "",
      helpText: "",
      visibility: "ALL",
      order: 0,
      isActive: true,
      options: [],
      validation: {
        min: undefined,
        max: undefined,
        minLength: undefined,
        maxLength: undefined,
        pattern: "",
      },
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedType = watch("type");
  const showOptions = ["DROPDOWN", "MULTI_SELECT", "RADIO"].includes(
    selectedType
  );
  const showMinMax = ["NUMBER", "DECIMAL", "CURRENCY"].includes(selectedType);
  const showLengthPattern = ["TEXT", "TEXTAREA", "PHONE"].includes(
    selectedType
  );

  const [optionInput, setOptionInput] = useState("");
  const [optionsList, setOptionsList] = useState<string[]>([]);

  useEffect(() => {
    if (fieldToEdit) {
      const existingOptions = Array.isArray(fieldToEdit.options)
        ? fieldToEdit.options.map((opt) =>
            typeof opt === "string"
              ? opt
              : (opt as { value?: string })?.value || String(opt)
          )
        : [];

      setOptionsList(existingOptions);

      const valConfig = (fieldToEdit.validation || {}) as Record<
        string,
        unknown
      >;

      reset({
        entityType: fieldToEdit.entityType,
        name: fieldToEdit.name,
        label: fieldToEdit.label,
        type: fieldToEdit.type,
        required: fieldToEdit.required,
        unique: fieldToEdit.unique,
        defaultValue: (fieldToEdit.defaultValue as string) || "",
        helpText: fieldToEdit.helpText || "",
        visibility: (fieldToEdit.visibility as CustomFieldVisibility) || "ALL",
        order: fieldToEdit.order || 0,
        isActive: fieldToEdit.isActive,
        options: existingOptions,
        validation: {
          min: (valConfig.min as number) ?? undefined,
          max: (valConfig.max as number) ?? undefined,
          minLength: (valConfig.minLength as number) ?? undefined,
          maxLength: (valConfig.maxLength as number) ?? undefined,
          pattern: (valConfig.pattern as string) || "",
        },
      });
    } else {
      setOptionsList([]);
      reset({
        entityType,
        name: "",
        label: "",
        type: "TEXT",
        required: false,
        unique: false,
        defaultValue: "",
        helpText: "",
        visibility: "ALL",
        order: 0,
        isActive: true,
        options: [],
        validation: {
          min: undefined,
          max: undefined,
          minLength: undefined,
          maxLength: undefined,
          pattern: "",
        },
      });
    }
    setServerError(null);
  }, [fieldToEdit, isOpen, entityType, reset]);

  if (!isOpen) return null;

  const handleAddOption = () => {
    const trimmed = optionInput.trim();
    if (!trimmed) return;
    if (optionsList.includes(trimmed)) return;
    const newList = [...optionsList, trimmed];
    setOptionsList(newList);
    setValue("options", newList);
    setOptionInput("");
  };

  const handleRemoveOption = (index: number) => {
    const newList = optionsList.filter((_, i) => i !== index);
    setOptionsList(newList);
    setValue("options", newList);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setServerError(null);

    const payload = {
      ...data,
      entityType,
      options: showOptions ? optionsList : null,
    };

    try {
      if (isEditing && fieldToEdit) {
        const result = await updateCustomFieldAction(fieldToEdit.id, payload);
        if (result.success) {
          onSuccess();
          onClose();
        } else {
          setServerError(result.error || "Failed to update custom field.");
        }
      } else {
        const result = await createCustomFieldAction(payload);
        if (result.success) {
          onSuccess();
          onClose();
        } else {
          setServerError(result.error || "Failed to create custom field.");
        }
      }
    } catch {
      setServerError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-generate name key from label if creating new
  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const labelVal = e.target.value;
    setValue("label", labelVal);
    if (!isEditing) {
      const camelCaseKey = labelVal
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s_]/g, "")
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
          index === 0 ? word.toLowerCase() : word.toUpperCase()
        )
        .replace(/\s+/g, "");
      setValue("name", camelCaseKey);
    }
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm duration-200">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-2 text-indigo-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {isEditing
                  ? `Edit Field (${fieldToEdit?.label})`
                  : "Add Custom Field"}
              </h2>
              <p className="text-xs text-slate-400">
                Define field rules, data type, options, and validation for{" "}
                {entityType}
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
          <div className="mx-6 mt-4 flex flex-shrink-0 items-start space-x-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form Content - Scrollable */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 space-y-5 overflow-y-auto p-6"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Field Label */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Display Label <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Parent Phone"
                {...register("label")}
                onChange={handleLabelChange}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
              />
              {errors.label && (
                <p className="text-[11px] text-red-400">
                  {String(errors.label.message)}
                </p>
              )}
            </div>

            {/* Field Identifier Name (camelCase key) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Field Identifier Key <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                disabled={isEditing}
                placeholder="e.g. parentPhone"
                {...register("name")}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-indigo-300 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none disabled:opacity-60"
              />
              {errors.name && (
                <p className="text-[11px] text-red-400">
                  {String(errors.name.message)}
                </p>
              )}
            </div>
          </div>

          {/* Field Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Field Input Type <span className="text-red-400">*</span>
            </label>
            <select
              {...register("type")}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
            >
              {CUSTOM_FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} — ({t.description})
                </option>
              ))}
            </select>
          </div>

          {/* Options Builder (for DROPDOWN, RADIO, MULTI_SELECT) */}
          {showOptions && (
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-1 text-xs font-semibold text-indigo-300">
                  <span>Choice Options List</span>
                  <span className="text-red-400">*</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {optionsList.length} option(s) defined
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={optionInput}
                  onChange={(e) => setOptionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddOption();
                    }
                  }}
                  placeholder="Type an option and press Enter or Add..."
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="flex items-center space-x-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Option</span>
                </button>
              </div>

              {optionsList.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {optionsList.map((opt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-1.5 rounded-lg border border-slate-700/60 bg-slate-900 px-2.5 py-1 text-xs text-slate-200"
                    >
                      <span>{opt}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-0.5 text-slate-400 transition-colors hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-amber-400/90 italic">
                  Add at least one option for this choice field.
                </p>
              )}
            </div>
          )}

          {/* Validation Rules Section */}
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <h4 className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
              Validation Rules & Constraints
            </h4>

            {showMinMax && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">
                    Minimum Value
                  </label>
                  <input
                    type="number"
                    step="any"
                    {...register("validation.min", { valueAsNumber: true })}
                    placeholder="e.g. 0"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">
                    Maximum Value
                  </label>
                  <input
                    type="number"
                    step="any"
                    {...register("validation.max", { valueAsNumber: true })}
                    placeholder="e.g. 100"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-100"
                  />
                </div>
              </div>
            )}

            {showLengthPattern && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">
                    Min Length
                  </label>
                  <input
                    type="number"
                    {...register("validation.minLength", {
                      valueAsNumber: true,
                    })}
                    placeholder="e.g. 2"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">
                    Max Length
                  </label>
                  <input
                    type="number"
                    {...register("validation.maxLength", {
                      valueAsNumber: true,
                    })}
                    placeholder="e.g. 50"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">
                    Regex Pattern
                  </label>
                  <input
                    type="text"
                    {...register("validation.pattern")}
                    placeholder="e.g. ^[0-9]+$"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-100"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Help Text / Tooltip
            </label>
            <input
              type="text"
              placeholder="e.g. Enter 10-digit mobile number of parent/guardian"
              {...register("helpText")}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
            />
          </div>

          {/* Configuration Toggles */}
          <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-3">
            <label className="flex cursor-pointer items-center space-x-2.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <input
                type="checkbox"
                {...register("required")}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="block text-xs font-semibold text-slate-200">
                  Required Field
                </span>
                <span className="text-[10px] text-slate-400">
                  Mandatory input
                </span>
              </div>
            </label>

            <label className="flex cursor-pointer items-center space-x-2.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <input
                type="checkbox"
                {...register("unique")}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="block text-xs font-semibold text-slate-200">
                  Unique Value
                </span>
                <span className="text-[10px] text-slate-400">
                  No duplicates
                </span>
              </div>
            </label>

            <label className="flex cursor-pointer items-center space-x-2.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <input
                type="checkbox"
                {...register("isActive")}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="block text-xs font-semibold text-slate-200">
                  Active Status
                </span>
                <span className="text-[10px] text-slate-400">
                  Visible in forms
                </span>
              </div>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-shrink-0 items-center justify-end space-x-3 border-t border-slate-800 pt-4">
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
              <span>{isEditing ? "Save Field" : "Create Custom Field"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
