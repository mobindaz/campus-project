"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FieldValueResolutionItem,
  TargetOption,
  ValueResolutionResult,
} from "../types";
import { resolveFieldValuesAction, saveValueMappingsAction } from "../actions";
import { applyValueMappings } from "@/server/services/value-mapping.service";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Bookmark,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";

export interface ValueMapperProps {
  entityType: string;
  rows: Array<Record<string, unknown>>;
  mappedFields: Record<string, string>; // { sourceHeader: canonicalFieldKey }
  onConfirm: (
    resolvedValueMap: Record<string, Record<string, string>>,
    transformedRows: Array<Record<string, unknown>>
  ) => void;
  onBack?: () => void;
}

export function ValueMapper({
  entityType,
  rows,
  mappedFields,
  onConfirm,
  onBack,
}: ValueMapperProps) {
  // Determine relational/enum field keys to resolve
  const relationalFieldKeys = useMemo(() => {
    const keys = new Set<string>();
    const knownRelational = [
      "department",
      "program",
      "batch",
      "academicPeriod",
    ];

    for (const canonicalKey of Object.values(mappedFields)) {
      if (canonicalKey && canonicalKey !== "__ignore__") {
        if (
          knownRelational.includes(canonicalKey) ||
          canonicalKey.startsWith("custom_") ||
          canonicalKey.includes("dept") ||
          canonicalKey.includes("branch") ||
          canonicalKey.includes("category")
        ) {
          keys.add(canonicalKey);
        }
      }
    }

    // Always inspect standard relational fields if present in rows
    if (rows.length > 0) {
      for (const k of knownRelational) {
        if (rows[0][k] !== undefined) {
          keys.add(k);
        }
      }
    }

    return Array.from(keys);
  }, [mappedFields, rows]);

  const hasRelationalFields = relationalFieldKeys.length > 0 && rows.length > 0;
  const [loading, setLoading] = useState(hasRelationalFields);
  const [error, setError] = useState<string | null>(null);
  const [resolutionResult, setResolutionResult] =
    useState<ValueResolutionResult | null>(null);

  // selections: { [fieldKey: string]: { [sourceValue: string]: { targetId: string; targetLabel: string } } }
  const [selections, setSelections] = useState<
    Record<string, Record<string, { targetId: string; targetLabel: string }>>
  >({});

  const [saveAliases, setSaveAliases] = useState(true);
  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "WARNINGS" | "UNRESOLVED"
  >("ALL");

  useEffect(() => {
    if (!hasRelationalFields) return;

    let isCancelled = false;

    const fetchResolutions = async () => {
      try {
        const res = await resolveFieldValuesAction(
          rows,
          relationalFieldKeys,
          entityType
        );

        if (isCancelled) return;

        if (!res.success || !res.data) {
          setError(res.error || "Failed to analyze spreadsheet field values.");
          setLoading(false);
          return;
        }

        setResolutionResult(res.data);

        // Initialize selections
        const initialSelections: Record<
          string,
          Record<string, { targetId: string; targetLabel: string }>
        > = {};

        for (const item of res.data.items) {
          if (!initialSelections[item.fieldKey]) {
            initialSelections[item.fieldKey] = {};
          }

          if (item.resolvedTargetId && item.resolvedTargetLabel) {
            initialSelections[item.fieldKey][item.sourceValue] = {
              targetId: item.resolvedTargetId,
              targetLabel: item.resolvedTargetLabel,
            };
          } else if (item.suggestedTargetId && item.suggestedTargetLabel) {
            // Pre-select suggestion for easy confirmation
            initialSelections[item.fieldKey][item.sourceValue] = {
              targetId: item.suggestedTargetId,
              targetLabel: item.suggestedTargetLabel,
            };
          }
        }

        setSelections(initialSelections);
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(
            err instanceof Error ? err.message : "An unexpected error occurred."
          );
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchResolutions();

    return () => {
      isCancelled = true;
    };
  }, [hasRelationalFields, entityType, relationalFieldKeys, rows]);

  // Handle dropdown target selection change
  const handleSelectTarget = (
    fieldKey: string,
    sourceValue: string,
    targetId: string,
    availableTargets: TargetOption[]
  ) => {
    const target = availableTargets.find((t) => t.id === targetId);
    if (!target) return;

    setSelections((prev) => ({
      ...prev,
      [fieldKey]: {
        ...(prev[fieldKey] || {}),
        [sourceValue]: {
          targetId: target.id,
          targetLabel: target.label,
        },
      },
    }));
  };

  // Group items by fieldKey
  const groupedItems = useMemo(() => {
    if (!resolutionResult) return {};
    const groups: Record<string, FieldValueResolutionItem[]> = {};

    for (const item of resolutionResult.items) {
      if (!groups[item.fieldKey]) {
        groups[item.fieldKey] = [];
      }
      groups[item.fieldKey].push(item);
    }

    return groups;
  }, [resolutionResult]);

  // Filter items
  const filteredGroups = useMemo(() => {
    if (activeFilter === "ALL") return groupedItems;

    const filtered: Record<string, FieldValueResolutionItem[]> = {};

    for (const [fieldKey, items] of Object.entries(groupedItems)) {
      const matching = items.filter((item) => {
        if (activeFilter === "WARNINGS") {
          return (
            item.status === "SUGGESTED_MATCH" || item.status === "UNRESOLVED"
          );
        }
        if (activeFilter === "UNRESOLVED") {
          return item.status === "UNRESOLVED";
        }
        return true;
      });

      if (matching.length > 0) {
        filtered[fieldKey] = matching;
      }
    }

    return filtered;
  }, [groupedItems, activeFilter]);

  // Verification status check
  const validationStatus = useMemo(() => {
    if (!resolutionResult) {
      return { allSelected: true, pendingCount: 0, totalCount: 0 };
    }

    let pendingCount = 0;
    const totalCount = resolutionResult.items.length;

    for (const item of resolutionResult.items) {
      const selected = selections[item.fieldKey]?.[item.sourceValue];
      if (!selected || !selected.targetId) {
        pendingCount++;
      }
    }

    return {
      allSelected: pendingCount === 0,
      pendingCount,
      totalCount,
    };
  }, [resolutionResult, selections]);

  // Handle final submission
  const handleConfirmAndProceed = async () => {
    if (!validationStatus.allSelected) return;

    setLoading(true);

    try {
      // Build clean mapping table: { [fieldKey]: { [sourceValue]: targetId } }
      const valueMap: Record<string, Record<string, string>> = {};
      const aliasesToSave: Array<{
        entityType: string;
        fieldKey: string;
        sourceValue: string;
        targetId: string;
        targetLabel: string;
      }> = [];

      for (const [fieldKey, fieldSelections] of Object.entries(selections)) {
        valueMap[fieldKey] = {};
        for (const [sourceVal, targetObj] of Object.entries(fieldSelections)) {
          valueMap[fieldKey][sourceVal] = targetObj.targetId;

          if (saveAliases) {
            aliasesToSave.push({
              entityType,
              fieldKey,
              sourceValue: sourceVal,
              targetId: targetObj.targetId,
              targetLabel: targetObj.targetLabel,
            });
          }
        }
      }

      // Save aliases if requested
      if (saveAliases && aliasesToSave.length > 0) {
        await saveValueMappingsAction(aliasesToSave);
      }

      // Transform rows
      const transformedRows = applyValueMappings(rows, valueMap);

      onConfirm(valueMap, transformedRows);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to confirm value mappings."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading && !resolutionResult) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <RefreshCw className="mb-4 h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Analyzing relational values in uploaded file...
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Matching departments, programs, batches, and academic periods against
          college records
        </p>
      </div>
    );
  }

  // If no relational values to map
  if (!resolutionResult || resolutionResult.items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-3 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" />
          <h3 className="text-base font-semibold">No Value Mapping Required</h3>
        </div>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
          All columns in your file are direct text/numeric fields or have no
          relational values needing alias resolution.
        </p>
        <div className="flex justify-end gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
            >
              Back
            </button>
          )}
          <button
            onClick={() => onConfirm({}, rows)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700"
          >
            Continue to Preview
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Value Mapping & Alias Confirmation
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Verify how spreadsheet values (e.g. &quot;CSE&quot; or
              &quot;CS&quot;) map to actual database records in your college.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-center dark:bg-slate-800">
              <span className="block text-xs font-semibold text-slate-500">
                Total Values
              </span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {resolutionResult.totalUniqueValues}
              </span>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
              <span className="block text-xs font-semibold text-emerald-600">
                Auto-Resolved
              </span>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                {resolutionResult.resolvedCount}
              </span>
            </div>

            {resolutionResult.requiresConfirmationCount +
              resolutionResult.unresolvedCount >
              0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-center dark:border-amber-900 dark:bg-amber-950/40">
                <span className="block text-xs font-semibold text-amber-600">
                  Needs Review
                </span>
                <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                  {resolutionResult.requiresConfirmationCount +
                    resolutionResult.unresolvedCount}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Spec §18 Warning Callout if needed */}
        {resolutionResult.requiresConfirmationCount +
          resolutionResult.unresolvedCount >
          0 && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-950/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="text-xs text-amber-800 dark:text-amber-300">
              <span className="font-semibold">
                Explicit Confirmation Required (Spec §18):
              </span>{" "}
              Unmapped or candidate values are never silently created as new
              departments. Please verify the target mappings below before
              continuing.
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => setActiveFilter("ALL")}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
              activeFilter === "ALL"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            All Values ({resolutionResult.totalUniqueValues})
          </button>
          <button
            onClick={() => setActiveFilter("WARNINGS")}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
              activeFilter === "WARNINGS"
                ? "bg-white text-amber-700 shadow-xs dark:bg-slate-900 dark:text-amber-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Requires Review (
            {resolutionResult.requiresConfirmationCount +
              resolutionResult.unresolvedCount}
            )
          </button>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 select-none dark:text-slate-300">
          <input
            type="checkbox"
            checked={saveAliases}
            onChange={(e) => setSaveAliases(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <Bookmark className="h-3.5 w-3.5 text-indigo-600" />
          <span>Save aliases to remember for future imports</span>
        </label>
      </div>

      {/* Value Mapping Cards Grouped by Field */}
      <div className="space-y-6">
        {Object.entries(filteredGroups).map(([fieldKey, items]) => {
          const fieldTitle = items[0]?.fieldLabel || fieldKey;

          return (
            <div
              key={fieldKey}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Field Group Title */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold tracking-wider text-indigo-600 uppercase dark:text-indigo-400">
                    Field
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {fieldTitle}
                  </span>
                  <span className="text-xs text-slate-500">
                    ({items.length} unique values)
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {items.map((item) => {
                  const currentSelection =
                    selections[item.fieldKey]?.[item.sourceValue];
                  const selectedId = currentSelection?.targetId || "";

                  return (
                    <div
                      key={item.sourceValue}
                      className="flex flex-col justify-between gap-4 p-4 transition-colors hover:bg-slate-50/50 md:flex-row md:items-center dark:hover:bg-slate-800/20"
                    >
                      {/* Left: Source Value and Occurrences */}
                      <div className="min-w-[240px] space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                            &quot;{item.sourceValue}&quot;
                          </span>
                          <span className="text-xs text-slate-500">
                            appears in{" "}
                            <strong className="text-slate-700 dark:text-slate-300">
                              {item.occurrenceCount}
                            </strong>{" "}
                            {item.occurrenceCount === 1 ? "row" : "rows"}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {item.status === "RESOLVED_EXACT" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              Exact Match
                            </span>
                          )}
                          {item.status === "RESOLVED_ALIAS" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-400">
                              <Bookmark className="h-3 w-3" />
                              Saved Alias
                            </span>
                          )}
                          {item.status === "SUGGESTED_MATCH" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                              <AlertTriangle className="h-3 w-3" />
                              Candidate Suggestion (
                              {Math.round(item.confidence * 100)}% match)
                            </span>
                          )}
                          {item.status === "UNRESOLVED" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
                              <AlertCircle className="h-3 w-3" />
                              Unmapped Value
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Target Record Selector */}
                      <div className="max-w-md flex-1">
                        <label className="mb-1 block text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                          Maps to Database Record
                        </label>
                        <select
                          value={selectedId}
                          onChange={(e) =>
                            handleSelectTarget(
                              item.fieldKey,
                              item.sourceValue,
                              e.target.value,
                              item.availableTargets
                            )
                          }
                          className={`w-full rounded-lg border bg-white px-3 py-2 text-xs font-semibold transition-all dark:bg-slate-900 ${
                            !selectedId
                              ? "border-rose-300 text-rose-700 focus:ring-rose-500 dark:border-rose-800"
                              : item.status === "RESOLVED_EXACT"
                                ? "border-emerald-300 text-slate-900 dark:border-emerald-800 dark:text-slate-100"
                                : "border-indigo-300 text-slate-900 dark:border-indigo-800 dark:text-slate-100"
                          } focus:ring-2 focus:outline-hidden`}
                        >
                          <option value="">-- Select Target Record --</option>
                          {item.availableTargets.map((target) => (
                            <option key={target.id} value={target.id}>
                              {target.label}{" "}
                              {target.code ? `(${target.code})` : ""}{" "}
                              {target.details ? `— ${target.details}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Navigation Bar */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          {onBack && (
            <button
              onClick={onBack}
              disabled={loading}
              className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            >
              Back to Column Mapper
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!validationStatus.allSelected && (
            <span className="flex items-center gap-1 text-xs font-semibold text-rose-600">
              <AlertCircle className="h-3.5 w-3.5" />
              {validationStatus.pendingCount}{" "}
              {validationStatus.pendingCount === 1 ? "value" : "values"} still
              unmapped
            </span>
          )}

          <button
            onClick={handleConfirmAndProceed}
            disabled={!validationStatus.allSelected || loading}
            className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-bold shadow-xs transition-all ${
              validationStatus.allSelected && !loading
                ? "cursor-pointer bg-indigo-600 text-white hover:bg-indigo-700"
                : "cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800"
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Applying Mappings...
              </>
            ) : (
              <>
                Confirm Values & Proceed
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
