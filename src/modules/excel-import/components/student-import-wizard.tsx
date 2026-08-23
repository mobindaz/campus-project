"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  inspectExcelFileAction,
  parseExcelFileAction,
  suggestColumnMappingsAction,
} from "../actions";
import { ColumnMapper } from "./column-mapper";
import { ValueMapper } from "./value-mapper";
import { ImportPreview } from "./import-preview";
import type {
  ColumnMappingResult,
  ExcelParsedData,
  ExcelWorkbookInfo,
  ImportExecutionResult,
} from "../types";
import {
  UploadCloud,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Download,
  RotateCcw,
  GraduationCap,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import * as XLSX from "xlsx";

export type WizardStep =
  | "UPLOAD"
  | "SHEET_SELECT"
  | "COLUMN_MAPPING"
  | "VALUE_MAPPING"
  | "PREVIEW_EXECUTE";

export interface StudentImportWizardProps {
  onSuccessRedirectUrl?: string;
}

export function StudentImportWizard({
  onSuccessRedirectUrl = "/students",
}: StudentImportWizardProps) {
  // Wizard Stage
  const [currentStep, setCurrentStep] = useState<WizardStep>("UPLOAD");

  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Workbook & Parse State
  const [workbookInfo, setWorkbookInfo] = useState<ExcelWorkbookInfo | null>(
    null
  );
  const [selectedSheetName, setSelectedSheetName] = useState<string>("");
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);
  const [isParsingSheet, setIsParsingSheet] = useState(false);

  // Parsed Sheet Data
  const [parsedData, setParsedData] = useState<ExcelParsedData | null>(null);

  // Column Mapping State
  const [columnMappingResult, setColumnMappingResult] =
    useState<ColumnMappingResult | null>(null);
  const [confirmedColumnMapping, setConfirmedColumnMapping] = useState<
    Record<string, string>
  >({});
  const [mappedRows, setMappedRows] = useState<Array<Record<string, unknown>>>(
    []
  );

  // Final Execution Result
  const [executionResult, setExecutionResult] =
    useState<ImportExecutionResult | null>(null);

  // ─── Step 1: File Drop & Selection Handlers ───────────────────────────────

  const handleFileSelect = async (selectedFile: File) => {
    setUploadError(null);
    setIsUploading(true);
    setFile(selectedFile);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const inspectRes = await inspectExcelFileAction(formData);

      if (!inspectRes.success || !inspectRes.data) {
        setUploadError(inspectRes.error || "Failed to inspect spreadsheet.");
        setIsUploading(false);
        return;
      }

      setWorkbookInfo(inspectRes.data);
      const defaultSheet = inspectRes.data.sheets[0]?.name || "";
      setSelectedSheetName(defaultSheet);

      // If only 1 sheet exists, auto-parse it directly into column mapping
      if (inspectRes.data.totalSheets === 1) {
        await parseAndSuggestMappings(selectedFile, defaultSheet, 0);
      } else {
        setCurrentStep("SHEET_SELECT");
        setIsUploading(false);
      }
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to process file."
      );
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Download Sample Student Import Excel File
  const handleDownloadSampleTemplate = () => {
    const sampleHeaders = [
      "Register Number",
      "Full Name",
      "Email Address",
      "Mobile Phone",
      "Date of Birth",
      "Department",
      "Program",
      "Batch",
      "Semester",
    ];

    const sampleRows = [
      [
        "2024CSE001",
        "Aarav Sharma",
        "aarav.sharma@example.edu",
        "9876543210",
        "2004-05-18",
        "Computer Science & Engineering",
        "B.Tech",
        "2024-2028",
        "Semester 1",
      ],
      [
        "2024CSE002",
        "Diya Patel",
        "diya.patel@example.edu",
        "9876543211",
        "2004-08-22",
        "Computer Science",
        "B.Tech",
        "2024-2028",
        "Semester 1",
      ],
      [
        "2024ECE001",
        "Rohan Verma",
        "rohan.verma@example.edu",
        "9876543212",
        "2003-12-05",
        "Electronics & Communication",
        "B.Tech",
        "2024-2028",
        "Semester 1",
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([sampleHeaders, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "Sample_Student_Import_Template.xlsx");
  };

  // ─── Step 2: Parse Sheet & Auto-Suggest Column Mappings ───────────────────

  const parseAndSuggestMappings = async (
    targetFile: File,
    sheetName: string,
    hdrRowIdx: number
  ) => {
    setIsParsingSheet(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", targetFile);

      const parseRes = await parseExcelFileAction(formData, {
        sheetName,
        headerRowIndex: hdrRowIdx,
        skipEmptyRows: true,
        trimValues: true,
      });

      if (!parseRes.success || !parseRes.data) {
        setUploadError(parseRes.error || "Failed to parse spreadsheet sheet.");
        setIsParsingSheet(false);
        setIsUploading(false);
        return;
      }

      setParsedData(parseRes.data);

      const sourceHeaders = parseRes.data.headers.map(
        (h) => h.originalName || h.label || h.key
      );
      const suggestRes = await suggestColumnMappingsAction(
        sourceHeaders,
        "STUDENT"
      );

      if (!suggestRes.success || !suggestRes.data) {
        setUploadError(
          suggestRes.error || "Failed to suggest column mappings."
        );
        setIsParsingSheet(false);
        setIsUploading(false);
        return;
      }

      setColumnMappingResult(suggestRes.data);
      setCurrentStep("COLUMN_MAPPING");
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error ? err.message : "Error reading sheet."
      );
    } finally {
      setIsParsingSheet(false);
      setIsUploading(false);
    }
  };

  // ─── Step 3: Confirm Column Mappings & Map Rows ───────────────────────────

  const handleConfirmColumnMapping = (confirmedMap: Record<string, string>) => {
    setConfirmedColumnMapping(confirmedMap);

    if (!parsedData) return;

    // Header key lookup mapping original name/label to row object property key
    const headerKeyLookup = new Map<string, string>();
    for (const h of parsedData.headers) {
      headerKeyLookup.set(h.originalName || h.label || h.key, h.key);
      headerKeyLookup.set(h.label, h.key);
      headerKeyLookup.set(h.key, h.key);
    }

    // Transform raw spreadsheet rows into canonical object format
    const transformed: Array<Record<string, unknown>> = [];

    for (let rIdx = 0; rIdx < parsedData.rows.length; rIdx++) {
      const rawRow = parsedData.rows[rIdx];
      const mappedRowObj: Record<string, unknown> = {
        rowNumber: rIdx + 2,
      };

      for (const [sourceHeader, canonicalField] of Object.entries(
        confirmedMap
      )) {
        if (canonicalField && canonicalField !== "__ignore__") {
          const rowKey = headerKeyLookup.get(sourceHeader) || sourceHeader;
          const val =
            rawRow[rowKey] !== undefined
              ? rawRow[rowKey]
              : rawRow[sourceHeader];
          mappedRowObj[canonicalField] = val;
        }
      }

      transformed.push(mappedRowObj);
    }

    setMappedRows(transformed);
    setCurrentStep("VALUE_MAPPING");
  };

  // ─── Step 4: Value Mapping Confirmation ───────────────────────────────────

  const handleConfirmValueMapping = (
    _resolvedValueMap: Record<string, Record<string, string>>,
    transformedRows: Array<Record<string, unknown>>
  ) => {
    setMappedRows(transformedRows);
    setCurrentStep("PREVIEW_EXECUTE");
  };

  // ─── Step 5: Import Complete ──────────────────────────────────────────────

  const handleImportComplete = (result: ImportExecutionResult) => {
    setExecutionResult(result);
  };

  // Reset Wizard
  const handleResetWizard = () => {
    setFile(null);
    setWorkbookInfo(null);
    setParsedData(null);
    setColumnMappingResult(null);
    setConfirmedColumnMapping({});
    setMappedRows([]);
    setExecutionResult(null);
    setUploadError(null);
    setCurrentStep("UPLOAD");
  };

  // ─── Render Steps Indicator ───────────────────────────────────────────────

  const stepsList: Array<{ key: WizardStep; label: string }> = [
    { key: "UPLOAD", label: "Upload" },
    { key: "SHEET_SELECT", label: "Select Sheet" },
    { key: "COLUMN_MAPPING", label: "Map Columns" },
    { key: "VALUE_MAPPING", label: "Resolve Values" },
    { key: "PREVIEW_EXECUTE", label: "Preview & Import" },
  ];

  const getStepIndex = (step: WizardStep): number => {
    return stepsList.findIndex((s) => s.key === step);
  };

  const currentIdx = getStepIndex(currentStep);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Wizard Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Student Import Wizard
              </h1>
              <p className="text-xs text-slate-400">
                Safe, resilient batch student import with dynamic column & value
                mapping (Spec §65 & Correction #9).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadSampleTemplate}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-300 shadow-xs hover:border-slate-600 hover:bg-slate-700 hover:text-white"
          >
            <Download className="h-3.5 w-3.5 text-indigo-400" />
            Download Sample Template (.xlsx)
          </button>

          {currentStep !== "UPLOAD" && (
            <button
              type="button"
              onClick={handleResetWizard}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Start Over
            </button>
          )}
        </div>
      </div>

      {/* Wizard Progress Steps Bar */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-sm backdrop-blur-md">
        <div className="flex items-center justify-between">
          {stepsList.map((step, idx) => {
            const isCompleted = idx < currentIdx;
            const isCurrent = idx === currentIdx;

            return (
              <React.Fragment key={step.key}>
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      isCompleted
                        ? "bg-emerald-500 text-slate-950 shadow-xs"
                        : isCurrent
                          ? "border border-indigo-400 bg-indigo-600 text-white shadow-md ring-2 shadow-indigo-500/20 ring-indigo-500/30"
                          : "border border-slate-800 bg-slate-800/60 text-slate-500"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      isCurrent
                        ? "text-indigo-400"
                        : isCompleted
                          ? "text-slate-300"
                          : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {idx < stepsList.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 ${
                      idx < currentIdx ? "bg-emerald-500/50" : "bg-slate-800"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Global Wizard Error Banner */}
      {uploadError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* ─── STEP 1: UPLOAD DROPZONE ────────────────────────────────────────── */}
      {currentStep === "UPLOAD" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
              isDragging
                ? "scale-[0.99] border-indigo-500 bg-indigo-500/10"
                : "border-slate-700 bg-slate-900/60 hover:border-indigo-500/60 hover:bg-slate-900/90"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 transition-transform group-hover:scale-110">
              <UploadCloud className="h-8 w-8" />
            </div>

            <h3 className="mt-4 text-base font-bold text-white">
              {isUploading
                ? "Inspecting spreadsheet..."
                : "Drop your student Excel file here, or browse"}
            </h3>

            <p className="mt-1.5 max-w-sm text-xs text-slate-400">
              Supports .xlsx, .xls, and .csv files up to 10MB. Entity-agnostic
              parser with flexible column headers.
            </p>

            <div className="mt-6 flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                Any Header Structure
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                AI-Ready Aliases
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-cyan-400" />
                Error Isolated
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 2: SHEET SELECTOR (Multi-sheet workbooks) ────────────────── */}
      {currentStep === "SHEET_SELECT" && workbookInfo && file && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-white">
              Select Worksheet to Import
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              File &quot;{file?.name || "Spreadsheet"}&quot; contains{" "}
              {workbookInfo.totalSheets} sheets. Pick the worksheet containing
              student rows.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {workbookInfo.sheets.map((sheet) => (
              <button
                key={sheet.name}
                type="button"
                onClick={() => setSelectedSheetName(sheet.name)}
                className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                  selectedSheetName === sheet.name
                    ? "border-indigo-500 bg-indigo-500/10 text-white ring-2 ring-indigo-500/20"
                    : "hover:bg-slate-850 border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Layers className="h-5 w-5 text-indigo-400" />
                  <div>
                    <span className="font-semibold">{sheet.name}</span>
                    <p className="text-[11px] text-slate-500">
                      {sheet.rowCount} rows detected
                    </p>
                  </div>
                </div>
                {selectedSheetName === sheet.name && (
                  <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                )}
              </button>
            ))}
          </div>

          {/* Header Row Index Option */}
          <div className="mt-6 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
            <label className="flex items-center gap-3 text-xs font-semibold text-slate-300">
              <span>Header Row Position:</span>
              <input
                type="number"
                min={1}
                max={20}
                value={headerRowIndex + 1}
                onChange={(e) =>
                  setHeaderRowIndex(
                    Math.max(0, parseInt(e.target.value, 10) - 1 || 0)
                  )
                }
                className="w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <span className="font-normal text-slate-500">
                (Row 1 by default, or auto-detect if unusual titles appear
                above)
              </span>
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep("UPLOAD")}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!selectedSheetName || isParsingSheet}
              onClick={() =>
                parseAndSuggestMappings(file, selectedSheetName, headerRowIndex)
              }
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              {isParsingSheet
                ? "Parsing Sheet..."
                : "Proceed to Column Mapping"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: COLUMN MAPPING ────────────────────────────────────────── */}
      {currentStep === "COLUMN_MAPPING" &&
        columnMappingResult &&
        parsedData && (
          <ColumnMapper
            entityType="STUDENT"
            sourceHeaders={parsedData.headers}
            previewRows={parsedData.rows}
            initialMappingResult={columnMappingResult}
            onConfirm={handleConfirmColumnMapping}
            onCancel={() => {
              if (workbookInfo && workbookInfo.totalSheets > 1) {
                setCurrentStep("SHEET_SELECT");
              } else {
                setCurrentStep("UPLOAD");
              }
            }}
          />
        )}

      {/* ─── STEP 4: VALUE MAPPING ────────────────────────────────────────── */}
      {currentStep === "VALUE_MAPPING" && (
        <ValueMapper
          entityType="STUDENT"
          rows={mappedRows}
          mappedFields={confirmedColumnMapping}
          onConfirm={handleConfirmValueMapping}
          onBack={() => setCurrentStep("COLUMN_MAPPING")}
        />
      )}

      {/* ─── STEP 5: VALIDATION & PREVIEW EXECUTION ────────────────────────── */}
      {currentStep === "PREVIEW_EXECUTE" && file && (
        <div className="space-y-6">
          <ImportPreview
            entityType="STUDENT"
            fileName={file.name}
            fileSize={file.size}
            rows={mappedRows}
            onComplete={handleImportComplete}
            onBack={() => setCurrentStep("VALUE_MAPPING")}
          />

          {/* Post-Import Complete Navigation Card */}
          {executionResult && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center shadow-lg">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-lg font-bold text-white">
                Import Operation Completed
              </h3>
              <p className="mt-1 text-xs text-emerald-300/80">
                Successfully processed {executionResult.totalRows} records (
                {executionResult.createdCount} created,{" "}
                {executionResult.updatedCount} updated,{" "}
                {executionResult.errorCount} isolated errors).
              </p>

              <div className="mt-5 flex items-center justify-center gap-3">
                <Link
                  href={onSuccessRedirectUrl}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500"
                >
                  View Students Directory
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={handleResetWizard}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Import Another File
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
