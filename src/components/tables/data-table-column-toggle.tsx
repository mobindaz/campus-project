"use client";

import React, { useState, useRef, useEffect } from "react";
import { Columns3, RotateCcw } from "lucide-react";

export interface ColumnToggleItem {
  id: string;
  header: string;
  visible: boolean;
  isCustomField?: boolean;
}

export interface DataTableColumnToggleProps {
  columns: ColumnToggleItem[];
  onToggle: (columnId: string) => void;
  onShowAll: () => void;
  onReset: () => void;
}

export function DataTableColumnToggle({
  columns,
  onToggle,
  onShowAll,
  onReset,
}: DataTableColumnToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const visibleCount = columns.filter((c) => c.visible).length;
  const totalCount = columns.length;

  return (
    <div ref={containerRef} className="relative">
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
          isOpen
            ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300"
            : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200"
        }`}
      >
        <Columns3 className="h-3.5 w-3.5" />
        <span>Columns</span>
        <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
          {visibleCount}/{totalCount}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/40">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2.5">
            <span className="text-xs font-semibold text-slate-300">
              Toggle Columns
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => {
                  onShowAll();
                }}
                className="rounded-md px-2 py-0.5 text-[10px] font-medium text-indigo-400 transition-colors hover:bg-indigo-500/10"
              >
                Show All
              </button>
              <button
                type="button"
                onClick={() => {
                  onReset();
                }}
                className="flex items-center space-x-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Column List */}
          <div className="max-h-64 overflow-y-auto p-1.5">
            {columns.map((col) => (
              <label
                key={col.id}
                className="flex cursor-pointer items-center space-x-2.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-slate-800/60"
              >
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => onToggle(col.id)}
                  className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
                />
                <span className="flex-1 text-xs text-slate-300">
                  {col.header}
                </span>
                {col.isCustomField && (
                  <span className="rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-purple-400 uppercase">
                    Custom
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
