"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ExecuteImportInput,
  ImportExecutionResult,
  ImportValidationResult,
  MatchingStrategy,
  RowValidationResult,
} from "../types";
import { validateImportRowsAction, executeImportAction } from "../actions";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Database,
  UserPlus,
  UserCheck,
  FileCheck2,
  SlidersHorizontal,
  ChevronLeft,
} from "lucide-react";

export interface ImportPreviewProps {
  entityType: string;
  fileName: string;
  fileSize?: number;
  rows: Array<Record<string, unknown>>;
  onComplete: (result: ImportExecutionResult) => void;
  onBack?: () => void;
}

export function ImportPreview({
  entityType,
  fileName,
  fileSize,
  rows,
  onComplete,
  onBack,
}: ImportPreviewProps) {
  const hasRows = rows.length > 0;
  const [matchingStrategy, setMatchingStrategy] =
    useState<MatchingStrategy>("registerNumber");
  const [loading, setLoading] = useState(hasRows);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] =
    useState<ImportValidationResult | null>(null);
  const [executionResult, setExecutionResult] =
    useState<ImportExecutionResult | null>(null);

  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "VALID" | "CREATE" | "UPDATE" | "WARNINGS" | "ERRORS"
  >("ALL");

  const [searchTerm, setSearchTerm] = useState("");

  // Load and run validation
  useEffect(() => {
    if (!hasRows) return;

    let isCancelled = false;

    const runValidation = async () => {
      try {
        const res = await validateImportRowsAction(
          rows,
          entityType,
          matchingStrategy
        );

        if (isCancelled) return;

        if (!res.success || !res.data) {
          setError(res.error || "Failed to validate spreadsheet rows.");
          setLoading(false);
          return;
        }

        setValidationResult(res.data);
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

    runValidation();

    return () => {
      isCancelled = true;
    };
  }, [hasRows, entityType, matchingStrategy, rows]);

  // Filter rows
  const filteredRows = useMemo(() => {
    if (!validationResult) return [];

    return validationResult.rows.filter((row) => {
      // Status Filter
      if (activeFilter === "VALID") {
        if (row.status === "ERROR" || row.status === "DUPLICATE") return false;
      } else if (activeFilter === "CREATE") {
        if (row.action !== "CREATE") return false;
      } else if (activeFilter === "UPDATE") {
        if (row.action !== "UPDATE") return false;
      } else if (activeFilter === "WARNINGS") {
        if (row.status !== "WARNING") return false;
      } else if (activeFilter === "ERRORS") {
        if (row.status !== "ERROR" && row.status !== "DUPLICATE") return false;
      }

      // Search Filter
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        const regNo = String(row.data.registerNumber || "").toLowerCase();
        const name = String(row.data.name || "").toLowerCase();
        const email = String(row.data.email || "").toLowerCase();
        return (
          regNo.includes(term) || name.includes(term) || email.includes(term)
        );
      }

      return true;
    });
  }, [validationResult, activeFilter, searchTerm]);

  // Execute chunked import
  const handleExecuteImport = async () => {
    if (!validationResult || validationResult.summary.validRows === 0) return;

    setImporting(true);
    setError(null);

    try {
      const payload: ExecuteImportInput = {
        entityType,
        fileName,
        fileSize,
        matchingStrategy,
        rows: validationResult.rows.map((r) => ({
          ...r.data,
          rowNumber: r.rowNumber,
          action: r.action,
          errors: r.errors,
        })),
        skipErrors: true,
        chunkSize: 200,
        metadata: {
          totalRows: validationResult.summary.totalRows,
          validRows: validationResult.summary.validRows,
        },
      };

      const res = await executeImportAction(payload);

      if (!res.success || !res.data) {
        setError(res.error || "Failed to execute chunked import.");
        setImporting(false);
        return;
      }

      setExecutionResult(res.data);
      onComplete(res.data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setImporting(false);
    }
  };

  if (loading && !validationResult) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <RefreshCw className="mb-4 h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Running row-level schema and relational validation...
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Checking required fields, emails, phone numbers, dates, duplicates,
          and database constraints
        </p>
      </div>
    );
  }

  // Execution Success View
  if (executionResult) {
    return (
      <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Import Completed Successfully
            </h3>
            <p className="text-xs text-slate-500">
              File:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {fileName}
              </span>
            </p>
          </div>
        </div>

        {/* Execution KPI summary */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
            <span className="block text-xs font-semibold text-emerald-600">
              Created (New)
            </span>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {executionResult.createdCount}
            </span>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950/40">
            <span className="block text-xs font-semibold text-sky-600">
              Updated (Existing)
            </span>
            <span className="text-2xl font-black text-sky-700 dark:text-sky-300">
              {executionResult.updatedCount}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <span className="block text-xs font-semibold text-slate-500">
              Skipped
            </span>
            <span className="text-2xl font-black text-slate-700 dark:text-slate-300">
              {executionResult.skippedCount}
            </span>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/40">
            <span className="block text-xs font-semibold text-rose-600">
              Errors / Failed
            </span>
            <span className="text-2xl font-black text-rose-700 dark:text-rose-300">
              {executionResult.errorCount}
            </span>
          </div>
        </div>

        {/* Failed Rows Detail if any */}
        {executionResult.failedRows.length > 0 && (
          <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950/30">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
              <AlertCircle className="h-4 w-4" />
              <span>
                Isolated Failed Rows ({executionResult.failedRows.length})
              </span>
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-400">
              These rows failed database validation and were skipped without
              rolling back the valid records:
            </p>
            <div className="max-h-40 divide-y divide-rose-200 overflow-y-auto text-xs dark:divide-rose-800/60">
              {executionResult.failedRows.map((err, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1.5"
                >
                  <span className="font-semibold text-rose-900 dark:text-rose-200">
                    Row {err.rowNumber}{" "}
                    {err.identifier ? `(${err.identifier})` : ""}:
                  </span>
                  <span className="text-rose-700 dark:text-rose-300">
                    {err.error}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const summary = validationResult?.summary;

  return (
    <div className="space-y-6">
      {/* Top Banner with KPI Summary */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Import Validation & Preview
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              File:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {fileName}
              </span>{" "}
              — Review detected records, updates, and errors before database
              write.
            </p>
          </div>

          {/* Matching Strategy Control */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50">
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            <label className="text-xs font-semibold whitespace-nowrap text-slate-600 dark:text-slate-300">
              Match By:
            </label>
            <select
              value={matchingStrategy}
              onChange={(e) =>
                setMatchingStrategy(e.target.value as MatchingStrategy)
              }
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="registerNumber">Register Number (Default)</option>
              <option value="email">Email Address</option>
            </select>
          </div>
        </div>

        {/* Metric KPI Tiles */}
        {summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-800/40">
              <span className="block text-[11px] font-semibold text-slate-500">
                Total Rows
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-slate-100">
                {summary.totalRows}
              </span>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
              <span className="block text-[11px] font-semibold text-emerald-600">
                Ready to Import
              </span>
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                {summary.validRows}
              </span>
            </div>

            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-center dark:border-indigo-900 dark:bg-indigo-950/40">
              <span className="block flex items-center justify-center gap-1 text-[11px] font-semibold text-indigo-600">
                <UserPlus className="h-3 w-3" /> New
              </span>
              <span className="text-lg font-black text-indigo-700 dark:text-indigo-300">
                {summary.createCount}
              </span>
            </div>

            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-center dark:border-sky-900 dark:bg-sky-950/40">
              <span className="block flex items-center justify-center gap-1 text-[11px] font-semibold text-sky-600">
                <UserCheck className="h-3 w-3" /> Updates
              </span>
              <span className="text-lg font-black text-sky-700 dark:text-sky-300">
                {summary.updateCount}
              </span>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center dark:border-amber-900 dark:bg-amber-950/40">
              <span className="block text-[11px] font-semibold text-amber-600">
                Warnings
              </span>
              <span className="text-lg font-black text-amber-700 dark:text-amber-300">
                {summary.warningRows}
              </span>
            </div>

            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-center dark:border-rose-900 dark:bg-rose-950/40">
              <span className="block text-[11px] font-semibold text-rose-600">
                Errors
              </span>
              <span className="text-lg font-black text-rose-700 dark:text-rose-300">
                {summary.errorRows + summary.duplicateRows}
              </span>
            </div>
          </div>
        )}

        {/* Error Alert Banner if any */}
        {summary && summary.errorRows + summary.duplicateRows > 0 && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/60 dark:bg-amber-950/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="text-xs text-amber-800 dark:text-amber-300">
              <span className="font-semibold">
                Row-Level Error Isolation (Correction #9):
              </span>{" "}
              {summary.errorRows + summary.duplicateRows} invalid rows were
              detected. Valid rows ({summary.validRows}) will be safely imported
              without rolling back the batch.
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => setActiveFilter("ALL")}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
              activeFilter === "ALL"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            All ({summary?.totalRows || 0})
          </button>
          <button
            onClick={() => setActiveFilter("VALID")}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
              activeFilter === "VALID"
                ? "bg-white text-emerald-700 shadow-xs dark:bg-slate-900 dark:text-emerald-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Valid ({summary?.validRows || 0})
          </button>
          <button
            onClick={() => setActiveFilter("CREATE")}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
              activeFilter === "CREATE"
                ? "bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            New ({summary?.createCount || 0})
          </button>
          <button
            onClick={() => setActiveFilter("UPDATE")}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
              activeFilter === "UPDATE"
                ? "bg-white text-sky-700 shadow-xs dark:bg-slate-900 dark:text-sky-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Updates ({summary?.updateCount || 0})
          </button>
          <button
            onClick={() => setActiveFilter("ERRORS")}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
              activeFilter === "ERRORS"
                ? "bg-white text-rose-700 shadow-xs dark:bg-slate-900 dark:text-rose-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Errors ({(summary?.errorRows || 0) + (summary?.duplicateRows || 0)})
          </button>
        </div>

        <input
          type="text"
          placeholder="Search by Reg No, Name, or Email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden sm:w-64 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      {/* Preview Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="max-h-[500px] overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 font-bold tracking-wider text-slate-500 uppercase dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2.5">Row</th>
                <th className="px-3 py-2.5">Action</th>
                <th className="px-3 py-2.5">Register No</th>
                <th className="px-3 py-2.5">Student Name</th>
                <th className="px-3 py-2.5">Email</th>
                <th className="px-3 py-2.5">Program</th>
                <th className="px-3 py-2.5">Batch</th>
                <th className="px-3 py-2.5">Period</th>
                <th className="px-3 py-2.5">Validation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No rows match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row: RowValidationResult) => {
                  const hasErrors = row.errors.length > 0;
                  const hasWarnings = row.warnings.length > 0;

                  return (
                    <tr
                      key={row.rowNumber}
                      className={`transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${
                        hasErrors
                          ? "bg-rose-50/30 dark:bg-rose-950/10"
                          : hasWarnings
                            ? "bg-amber-50/20 dark:bg-amber-950/5"
                            : ""
                      }`}
                    >
                      <td className="px-3 py-2.5 font-mono font-semibold text-slate-500">
                        {row.rowNumber}
                      </td>

                      {/* Action Badge */}
                      <td className="px-3 py-2.5">
                        {row.action === "CREATE" && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400">
                            <UserPlus className="h-3 w-3" /> Create
                          </span>
                        )}
                        {row.action === "UPDATE" && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-400">
                            <UserCheck className="h-3 w-3" /> Update
                          </span>
                        )}
                        {row.action === "SKIP" && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
                            <AlertCircle className="h-3 w-3" /> Skip
                          </span>
                        )}
                      </td>

                      {/* Register Number */}
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {String(row.data.registerNumber || "—")}
                      </td>

                      {/* Name */}
                      <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                        {String(row.data.name || "—")}
                      </td>

                      {/* Email */}
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {String(row.data.email || "—")}
                      </td>

                      {/* Program */}
                      <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300">
                        {String(row.data.programId || "—")}
                      </td>

                      {/* Batch */}
                      <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300">
                        {String(row.data.batchId || "—")}
                      </td>

                      {/* Period */}
                      <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300">
                        {String(row.data.academicPeriodId || "—")}
                      </td>

                      {/* Validation Messages */}
                      <td className="px-3 py-2.5">
                        {hasErrors ? (
                          <div className="space-y-1">
                            {row.errors.map((err, i) => (
                              <span
                                key={i}
                                className="block inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400"
                              >
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                {err.message}
                              </span>
                            ))}
                          </div>
                        ) : hasWarnings ? (
                          <div className="space-y-1">
                            {row.warnings.map((warn, i) => (
                              <span
                                key={i}
                                className="block inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400"
                              >
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                {warn.message}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Valid
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Navigation & CTA Bar */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          {onBack && (
            <button
              onClick={onBack}
              disabled={importing}
              className="flex items-center gap-1 rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExecuteImport}
            disabled={
              !summary || summary.validRows === 0 || importing || loading
            }
            className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-xs font-bold shadow-xs transition-all ${
              summary && summary.validRows > 0 && !importing && !loading
                ? "cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
                : "cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800"
            }`}
          >
            {importing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Executing Chunked Upsert (~200/batch)...
              </>
            ) : (
              <>
                <Database className="h-4 w-4" />
                Import {summary?.validRows || 0} Valid Records
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
