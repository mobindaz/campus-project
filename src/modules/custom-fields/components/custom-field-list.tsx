"use client";

import React from "react";
import { CustomFieldDefinitionDto } from "../types";
import {
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Type,
  Sparkles,
} from "lucide-react";

export interface CustomFieldListProps {
  fields: CustomFieldDefinitionDto[];
  onEdit: (field: CustomFieldDefinitionDto) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  isUpdating?: boolean;
}

export function CustomFieldList({
  fields,
  onEdit,
  onToggleStatus,
  onDelete,
  onMove,
  isUpdating = false,
}: CustomFieldListProps) {
  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
        <div className="mb-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-indigo-400">
          <Sparkles className="h-8 w-8" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">
          No Custom Fields Defined
        </h3>
        <p className="mt-1 mb-4 max-w-sm text-xs text-slate-400">
          Add custom attributes (e.g. Parent Phone, Aadhaar, Hostel Room) to
          capture college-specific student data without database migrations.
        </p>
      </div>
    );
  }

  const sortedFields = [...fields].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              <th className="w-12 px-4 py-3.5 text-center">Order</th>
              <th className="px-4 py-3.5">Label & Identifier</th>
              <th className="px-4 py-3.5">Type</th>
              <th className="px-4 py-3.5 text-center">Required</th>
              <th className="px-4 py-3.5 text-center">Status</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {sortedFields.map((field, index) => {
              const isFirst = index === 0;
              const isLast = index === sortedFields.length - 1;

              return (
                <tr
                  key={field.id}
                  className={`transition-colors hover:bg-slate-800/40 ${
                    !field.isActive ? "bg-slate-950/30 opacity-60" : ""
                  }`}
                >
                  {/* Order Controls */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center justify-center space-y-0.5">
                      <button
                        type="button"
                        disabled={isFirst || isUpdating}
                        onClick={() => onMove(field.id, "up")}
                        className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200 disabled:opacity-20"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-mono text-[10px] font-bold text-slate-500">
                        {index + 1}
                      </span>
                      <button
                        type="button"
                        disabled={isLast || isUpdating}
                        onClick={() => onMove(field.id, "down")}
                        className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200 disabled:opacity-20"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>

                  {/* Label & Identifier Key */}
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-100">
                        {field.label}
                      </span>
                      {field.unique && (
                        <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                          UNIQUE
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center space-x-2">
                      <span className="font-mono text-[11px] text-indigo-400">
                        {field.name}
                      </span>
                      {field.helpText && (
                        <span className="max-w-xs truncate text-[10px] text-slate-500">
                          • {field.helpText}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Type Badge */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                      <Type className="h-3 w-3 text-indigo-400" />
                      <span>{field.type}</span>
                    </span>
                  </td>

                  {/* Required Indicator */}
                  <td className="px-4 py-3 text-center">
                    {field.required ? (
                      <span className="inline-flex items-center rounded border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400">
                        YES *
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">
                        Optional
                      </span>
                    )}
                  </td>

                  {/* Status Toggle */}
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => onToggleStatus(field.id, field.isActive)}
                      className={`inline-flex items-center space-x-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                        field.isActive
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          : "border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      {field.isActive ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" />
                          <span>Inactive</span>
                        </>
                      )}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => onEdit(field)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-indigo-500/10 hover:text-indigo-400"
                        title="Edit Field Definition"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(field.id)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        title="Delete Custom Field"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
