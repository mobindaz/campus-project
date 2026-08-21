"use client";

import React, { useState } from "react";
import { FieldErrors, FieldValues } from "react-hook-form";
import { CustomFieldDefinitionDto, ENTITY_TYPES } from "../types";
import {
  toggleCustomFieldStatusAction,
  deleteCustomFieldAction,
  reorderCustomFieldsAction,
} from "../actions";
import { CustomFieldList } from "./custom-field-list";
import { CustomFieldFormDialog } from "./custom-field-form-dialog";
import { CustomFieldRenderer } from "@/components/forms/custom-field-renderer";
import { generateCustomFieldsZodSchema } from "@/server/services/custom-field.service";
import {
  Sliders,
  Plus,
  Sparkles,
  GraduationCap,
  Users,
  Building2,
  Briefcase,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export interface CustomFieldManagementClientProps {
  initialFields: CustomFieldDefinitionDto[];
}

export function CustomFieldManagementClient({
  initialFields,
}: CustomFieldManagementClientProps) {
  const [fields, setFields] =
    useState<CustomFieldDefinitionDto[]>(initialFields);
  const [selectedEntityType, setSelectedEntityType] =
    useState<string>("STUDENT");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fieldToEdit, setFieldToEdit] =
    useState<CustomFieldDefinitionDto | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Live preview interactive state
  const [previewValues, setPreviewValues] = useState<Record<string, unknown>>(
    {}
  );
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    errors?: Record<string, string>;
    data?: unknown;
  } | null>(null);

  const filteredFields = fields.filter(
    (f) => f.entityType === selectedEntityType
  );

  const fetchUpdatedFields = async () => {
    try {
      const res = await fetch(`/api/custom-fields?includeInactive=true`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setFields(json.data);
      }
    } catch (e) {
      console.error("Failed to refresh custom fields:", e);
    }
  };

  const handleOpenAddDialog = () => {
    setFieldToEdit(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (field: CustomFieldDefinitionDto) => {
    setFieldToEdit(field);
    setIsDialogOpen(true);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    setIsUpdating(true);
    try {
      const res = await toggleCustomFieldStatusAction(id, !currentStatus);
      if (res.success) {
        await fetchUpdatedFields();
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this custom field definition?"
      )
    ) {
      return;
    }
    setIsUpdating(true);
    try {
      const res = await deleteCustomFieldAction(id);
      if (res.success) {
        await fetchUpdatedFields();
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMove = async (id: string, direction: "up" | "down") => {
    const list = [...filteredFields].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
    const currentIndex = list.findIndex((f) => f.id === id);
    if (currentIndex === -1) return;

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    // Swap items
    const temp = list[currentIndex];
    list[currentIndex] = list[targetIndex];
    list[targetIndex] = temp;

    const reorderedIds = list.map((item) => item.id);

    setIsUpdating(true);
    try {
      const res = await reorderCustomFieldsAction(
        selectedEntityType,
        reorderedIds
      );
      if (res.success) {
        await fetchUpdatedFields();
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Test live validation against dynamic Zod schema
  const handleTestValidation = () => {
    const activeDefs = filteredFields.filter((f) => f.isActive !== false);
    const schema = generateCustomFieldsZodSchema(activeDefs);
    const parseResult = schema.safeParse(previewValues);

    if (parseResult.success) {
      setValidationResult({
        success: true,
        data: parseResult.data,
      });
    } else {
      const errMap: Record<string, string> = {};
      parseResult.error.issues.forEach((issue) => {
        const pathKey = String(issue.path[0] || "general");
        errMap[pathKey] = issue.message;
      });
      setValidationResult({
        success: false,
        errors: errMap,
      });
    }
  };

  const handlePreviewChange = (name: string, val: unknown) => {
    setPreviewValues((prev) => ({
      ...prev,
      [name]: val,
    }));
    setValidationResult(null);
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case "STUDENT":
        return <GraduationCap className="h-4 w-4 text-indigo-400" />;
      case "FACULTY":
        return <Users className="h-4 w-4 text-purple-400" />;
      case "COMPANY":
        return <Building2 className="h-4 w-4 text-emerald-400" />;
      case "PLACEMENT_DRIVE":
        return <Briefcase className="h-4 w-4 text-amber-400" />;
      default:
        return <Sliders className="h-4 w-4 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Entity Type Selector Tabs */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-white">
            <Sliders className="h-7 w-7 text-indigo-400" />
            Custom Field Engine
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Define college-specific JSONB fields for entities with zero database
            migrations.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddDialog}
          className="flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Add Custom Field</span>
        </button>
      </div>

      {/* Entity Selection Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {ENTITY_TYPES.map((tab) => {
          const isActive = selectedEntityType === tab.value;
          const count = fields.filter((f) => f.entityType === tab.value).length;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setSelectedEntityType(tab.value);
                setPreviewValues({});
                setValidationResult(null);
              }}
              className={`flex items-center space-x-2 rounded-xl border px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "border-indigo-500/40 bg-indigo-600/15 text-indigo-300 shadow-md"
                  : "border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              {getEntityIcon(tab.value)}
              <span>{tab.label}</span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                  isActive
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Two Column Grid: Left Table, Right Live Preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Field Definitions Table */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="flex items-center space-x-2 text-sm font-bold text-slate-200">
              <span>
                {
                  ENTITY_TYPES.find((t) => t.value === selectedEntityType)
                    ?.label
                }{" "}
                Fields
              </span>
              <span className="text-xs font-normal text-slate-500">
                ({filteredFields.length} configured)
              </span>
            </h2>
          </div>

          <CustomFieldList
            fields={filteredFields}
            onEdit={handleOpenEditDialog}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
            onMove={handleMove}
            isUpdating={isUpdating}
          />
        </div>

        {/* Right Column: Interactive Live Preview & Runtime Validation */}
        <div className="space-y-4">
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <h3 className="text-xs font-bold tracking-wider text-slate-200 uppercase">
                  Live Form Preview & Validation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewValues({});
                  setValidationResult(null);
                }}
                className="p-1 text-slate-500 transition-colors hover:text-slate-300"
                title="Reset Form Preview"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            {filteredFields.length > 0 ? (
              <div className="space-y-4">
                <p className="text-[11px] text-slate-400">
                  This form is rendered dynamically from active field
                  definitions for{" "}
                  <strong className="text-slate-200">
                    {selectedEntityType}
                  </strong>
                  .
                </p>

                <CustomFieldRenderer
                  fields={filteredFields}
                  values={previewValues}
                  onChange={handlePreviewChange}
                  errors={
                    (validationResult?.errors
                      ? {
                          customFields: Object.fromEntries(
                            Object.entries(validationResult.errors).map(
                              ([k, msg]) => [k, { message: msg }]
                            )
                          ),
                        }
                      : {}) as unknown as FieldErrors<FieldValues>
                  }
                />

                <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                  <button
                    type="button"
                    onClick={handleTestValidation}
                    className="flex w-full items-center justify-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-500"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Test Runtime Zod Schema</span>
                  </button>
                </div>

                {/* Validation Output Alert */}
                {validationResult && (
                  <div
                    className={`animate-in fade-in rounded-xl border p-3 text-xs duration-200 ${
                      validationResult.success
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        : "border-red-500/20 bg-red-500/10 text-red-300"
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {validationResult.success ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                      ) : (
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                      )}
                      <div className="space-y-1">
                        <span className="block font-bold">
                          {validationResult.success
                            ? "Runtime Zod Schema Validation Passed!"
                            : "Validation Failed"}
                        </span>
                        {validationResult.success ? (
                          <pre className="max-h-32 overflow-x-auto rounded border border-slate-800 bg-slate-950 p-2 font-mono text-[10px] text-emerald-400">
                            {JSON.stringify(validationResult.data, null, 2)}
                          </pre>
                        ) : (
                          <ul className="list-inside list-disc space-y-0.5 text-[11px]">
                            {Object.entries(validationResult.errors || {}).map(
                              ([k, msg]) => (
                                <li key={k}>
                                  <strong className="font-mono">{k}</strong>:{" "}
                                  {msg}
                                </li>
                              )
                            )}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-slate-500 italic">
                Add custom fields to preview input forms and test schema
                validation.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Custom Field Modal Dialog */}
      <CustomFieldFormDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={async () => {
          await fetchUpdatedFields();
        }}
        entityType={selectedEntityType}
        fieldToEdit={fieldToEdit}
      />
    </div>
  );
}
