"use client";

import React, { type ReactNode } from "react";
import { Search, Download, X, Loader2 } from "lucide-react";
import {
  DataTableColumnToggle,
  type ColumnToggleItem,
} from "./data-table-column-toggle";

export interface FilterConfig {
  columnId: string;
  header: string;
  options: { label: string; value: string }[];
  value: string;
}

export interface DataTableToolbarProps {
  /** Current search term */
  search: string;
  /** Called when search changes (debounced by parent) */
  onSearchChange: (value: string) => void;

  /** Column filter configs (only for filterable columns) */
  filters: FilterConfig[];
  /** Called when a filter dropdown value changes */
  onFilterChange: (columnId: string, value: string) => void;

  /** Column toggle items */
  columnToggleItems: ColumnToggleItem[];
  onToggleColumn: (columnId: string) => void;
  onShowAllColumns: () => void;
  onResetColumns: () => void;

  /** Export button */
  showExport: boolean;
  isExporting: boolean;
  onExport: () => void;

  /** Optional create button slot */
  createButton?: ReactNode;

  /** Search placeholder text */
  searchPlaceholder?: string;
}

export function DataTableToolbar({
  search,
  onSearchChange,
  filters,
  onFilterChange,
  columnToggleItems,
  onToggleColumn,
  onShowAllColumns,
  onResetColumns,
  showExport,
  isExporting,
  onExport,
  createButton,
  searchPlaceholder = "Search...",
}: DataTableToolbarProps) {
  return (
    <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md lg:flex-row lg:items-center">
      {/* Left — Search */}
      <div className="relative min-w-[220px] flex-1">
        <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pr-8 pl-10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-0.5 text-slate-500 transition-colors hover:text-slate-300"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Right — Filters, Column Toggle, Export, Create */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Column Filters */}
        {filters.map((filter) => (
          <select
            key={filter.columnId}
            value={filter.value}
            onChange={(e) => onFilterChange(filter.columnId, e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none"
          >
            <option value="">All {filter.header}</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ))}

        {/* Column Toggle */}
        <DataTableColumnToggle
          columns={columnToggleItems}
          onToggle={onToggleColumn}
          onShowAll={onShowAllColumns}
          onReset={onResetColumns}
        />

        {/* CSV Export */}
        {showExport && (
          <button
            type="button"
            onClick={onExport}
            disabled={isExporting}
            className="flex items-center space-x-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span>{isExporting ? "Exporting…" : "Export CSV"}</span>
          </button>
        )}

        {/* Create Button Slot */}
        {createButton}
      </div>
    </div>
  );
}
