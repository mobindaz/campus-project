"use client";

import React, { useState, useEffect } from "react";
import {
  ColumnMappingResult,
  ExcelHeader,
  ExcelRawRow,
  ImportMappingTemplate,
  MatchReason,
} from "../types";
import {
  saveMappingTemplateAction,
  listMappingTemplatesAction,
  suggestColumnMappingsAction,
} from "../actions";
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Bookmark,
  Sparkles,
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react";

export interface ColumnMapperProps {
  entityType: string;
  sourceHeaders: ExcelHeader[] | string[];
  previewRows?: ExcelRawRow[];
  initialMappingResult: ColumnMappingResult;
  onConfirm: (
    confirmedMapping: Record<string, string>,
    savedTemplate?: ImportMappingTemplate
  ) => void;
  onCancel?: () => void;
  className?: string;
}

export function ColumnMapper({
  entityType,
  sourceHeaders,
  previewRows = [],
  initialMappingResult,
  onConfirm,
  onCancel,
  className = "",
}: ColumnMapperProps) {
  // Normalize source header strings
  const headerList: string[] = sourceHeaders.map((h) =>
    typeof h === "string" ? h : h.originalName || h.label || h.key
  );

  // Current mapping state: sourceHeader -> canonicalKey (or '__ignore__')
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const header of headerList) {
      const suggestion = initialMappingResult.suggestions[header];
      init[header] = suggestion?.suggestedKey || "__ignore__";
    }
    return init;
  });

  const [matchReasons, setMatchReasons] = useState<Record<string, MatchReason>>(
    () => {
      const init: Record<string, MatchReason> = {};
      for (const header of headerList) {
        init[header] =
          initialMappingResult.suggestions[header]?.matchReason || "NONE";
      }
      return init;
    }
  );

  const [templates, setTemplates] = useState<ImportMappingTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialMappingResult.matchedTemplate?.id || ""
  );
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load existing templates for this entityType
  useEffect(() => {
    async function loadTemplates() {
      setIsLoadingTemplates(true);
      const res = await listMappingTemplatesAction(entityType);
      if (res.success && res.data) {
        setTemplates(res.data);
      }
      setIsLoadingTemplates(false);
    }
    loadTemplates();
  }, [entityType]);

  // Handle template selection change
  const handleTemplateChange = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      // Re-run auto suggestions
      const res = await suggestColumnMappingsAction(headerList, entityType);
      if (res.success && res.data) {
        const newMap: Record<string, string> = {};
        const newReasons: Record<string, MatchReason> = {};
        for (const h of headerList) {
          const sug = res.data.suggestions[h];
          newMap[h] = sug?.suggestedKey || "__ignore__";
          newReasons[h] = sug?.matchReason || "NONE";
        }
        setMapping(newMap);
        setMatchReasons(newReasons);
      }
      return;
    }

    const selected = templates.find((t) => t.id === templateId);
    if (selected) {
      const newMap: Record<string, string> = {};
      const newReasons: Record<string, MatchReason> = {};
      for (const h of headerList) {
        const mappedKey = selected.mapping[h] || selected.mapping[h.trim()];
        if (mappedKey) {
          newMap[h] = mappedKey;
          newReasons[h] = "TEMPLATE";
        } else {
          newMap[h] = "__ignore__";
          newReasons[h] = "NONE";
        }
      }
      setMapping(newMap);
      setMatchReasons(newReasons);
    }
  };

  // Handle manual column mapping change
  const handleColumnChange = (sourceHeader: string, targetKey: string) => {
    setMapping((prev) => ({
      ...prev,
      [sourceHeader]: targetKey,
    }));
    setMatchReasons((prev) => ({
      ...prev,
      [sourceHeader]: targetKey === "__ignore__" ? "NONE" : "MANUAL",
    }));
  };

  // Calculate mapped canonical keys and identify missing required fields
  const canonicalFields = initialMappingResult.canonicalFields;
  const mappedCanonicalKeys = new Set(
    Object.values(mapping).filter((k) => k && k !== "__ignore__")
  );

  const requiredFields = canonicalFields.filter((f) => f.required);
  const unmappedRequiredFields = requiredFields.filter(
    (f) => !mappedCanonicalKeys.has(f.key)
  );
  const isFormValid = unmappedRequiredFields.length === 0;

  // Group canonical fields into Core and Custom
  const coreFields = canonicalFields.filter((f) => !f.isCustom);
  const customFields = canonicalFields.filter((f) => f.isCustom);

  // Get sample preview values for a column header
  const getSampleValues = (header: string): string[] => {
    const samples: string[] = [];
    for (const row of previewRows.slice(0, 3)) {
      const val = row[header];
      if (val !== null && val !== undefined && String(val).trim() !== "") {
        samples.push(String(val).trim());
      }
    }
    return samples;
  };

  // Handle final submission and confirmation
  const handleConfirm = async () => {
    if (!isFormValid) {
      setErrorMessage(
        `Please map all required fields: ${unmappedRequiredFields.map((f) => f.label).join(", ")}`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let savedTemplate: ImportMappingTemplate | undefined;

      if (saveAsTemplate && templateName.trim()) {
        const cleanMapping: Record<string, string> = {};
        for (const [src, tgt] of Object.entries(mapping)) {
          if (tgt && tgt !== "__ignore__") {
            cleanMapping[src] = tgt;
          }
        }

        const res = await saveMappingTemplateAction({
          name: templateName.trim(),
          entityType,
          mapping: cleanMapping,
          isDefault: false,
        });

        if (res.success && res.data) {
          savedTemplate = res.data;
        }
      }

      onConfirm(mapping, savedTemplate);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to confirm column mappings."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {/* Header section */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Confirm Column Mapping
            </h2>
          </div>
          <p className="text-slate-550 mt-1 text-sm dark:text-slate-400">
            Map columns from your spreadsheet to the system&apos;s canonical
            fields. Review the suggestions below before proceeding.
          </p>
        </div>

        {/* Template selector */}
        {templates.length > 0 && (
          <div className="flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
            <Bookmark className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Template:
            </span>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              disabled={isLoadingTemplates}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="">Auto-Suggest (Default)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.isDefault ? "(Default)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Matched Template Banner */}
      {initialMappingResult.matchedTemplate && !selectedTemplateId && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50/70 px-4 py-2.5 text-xs text-indigo-900 dark:border-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-300">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>
              Pre-filled based on saved template:{" "}
              <strong>{initialMappingResult.matchedTemplate.name}</strong> (
              {Math.round(
                initialMappingResult.matchedTemplate.matchScore * 100
              )}
              % match)
            </span>
          </div>
        </div>
      )}

      {/* Required fields validation bar */}
      <div className="mb-6 rounded-lg border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800/60 dark:bg-slate-950/50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Required Fields Status
          </span>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {requiredFields.length - unmappedRequiredFields.length} of{" "}
            {requiredFields.length} mapped
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {requiredFields.map((field) => {
            const isMapped = mappedCanonicalKeys.has(field.key);
            return (
              <span
                key={field.key}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  isMapped
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
                }`}
              >
                {isMapped ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                )}
                {field.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Column Mapping Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Source Excel Column</th>
              <th className="px-4 py-3">Match Type</th>
              <th className="px-4 py-3 text-center">
                <ArrowRight className="inline h-4 w-4 text-slate-400" />
              </th>
              <th className="px-4 py-3">Target System Field</th>
              <th className="px-4 py-3">Sample Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {headerList.map((header) => {
              const currentTarget = mapping[header] || "__ignore__";
              const reason = matchReasons[header] || "NONE";
              const samples = getSampleValues(header);

              return (
                <tr
                  key={header}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                >
                  {/* Source Column Header */}
                  <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                    <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {header}
                    </span>
                  </td>

                  {/* Match Confidence & Reason Badge */}
                  <td className="px-4 py-3.5">
                    {reason === "EXACT" && (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Exact Match
                      </span>
                    )}
                    {reason === "ALIAS" && (
                      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        Alias Match
                      </span>
                    )}
                    {(reason === "CASE_INSENSITIVE" ||
                      reason === "TRIMMED" ||
                      reason === "UNDERSCORE_NORMALIZED") && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        Normalized Match
                      </span>
                    )}
                    {reason === "TEMPLATE" && (
                      <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                        From Template
                      </span>
                    )}
                    {reason === "FUZZY" && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Fuzzy Match
                      </span>
                    )}
                    {reason === "MANUAL" && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Manual Select
                      </span>
                    )}
                    {reason === "NONE" && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                        Ignored
                      </span>
                    )}
                  </td>

                  {/* Arrow Indicator */}
                  <td className="px-4 py-3.5 text-center text-slate-400">
                    <ArrowRight className="inline h-4 w-4" />
                  </td>

                  {/* Target Field Dropdown */}
                  <td className="px-4 py-3.5">
                    <select
                      value={currentTarget}
                      onChange={(e) =>
                        handleColumnChange(header, e.target.value)
                      }
                      className={`w-full max-w-xs rounded-lg border px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                        currentTarget === "__ignore__"
                          ? "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500"
                          : "border-indigo-300 bg-white text-indigo-950 shadow-sm dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-100"
                      }`}
                    >
                      <option value="__ignore__">
                        [-- Ignore / Do Not Import --]
                      </option>

                      <optgroup label="Core Relational Fields">
                        {coreFields.map((field) => (
                          <option key={field.key} value={field.key}>
                            {field.label} {field.required ? "*" : ""} (
                            {field.type})
                          </option>
                        ))}
                      </optgroup>

                      {customFields.length > 0 && (
                        <optgroup label="Custom College Fields">
                          {customFields.map((field) => (
                            <option key={field.key} value={field.key}>
                              {field.label} {field.required ? "*" : ""} (
                              {field.type})
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </td>

                  {/* Sample Values Preview */}
                  <td className="px-4 py-3.5">
                    {samples.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {samples.map((s, idx) => (
                          <span
                            key={idx}
                            className="inline-block max-w-[140px] truncate rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            title={s}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        No sample data
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Save as Template Option */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={saveAsTemplate}
            onChange={(e) => setSaveAsTemplate(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Save this mapping as a reusable template for future uploads
        </label>

        {saveAsTemplate && (
          <div className="mt-3 flex max-w-md items-center gap-2">
            <input
              type="text"
              placeholder="e.g. Standard University ERP Format"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        )}
      </div>

      {/* Action CTA Buttons */}
      <div className="mt-6 flex items-center justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!isFormValid || isSubmitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Saving Mapping...
            </>
          ) : (
            <>
              Confirm Column Mapping
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
