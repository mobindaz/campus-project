"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import type {
  DataTableProps,
  DataTableColumnDef,
  DataTableConfig,
  DataTableResult,
} from "./data-table.types";
import { DataTableToolbar, type FilterConfig } from "./data-table-toolbar";
import { DataTablePagination } from "./data-table-pagination";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DataTable<TData>({
  columns: allColumns,
  fetchAction,
  permissions,
  exportPermission,
  exportAction,
  createButton,
  emptyIcon,
  emptyTitle = "No data found",
  emptyDescription = "No records match your current filters.",
  defaultPageSize = 10,
  searchPlaceholder,
}: DataTableProps<TData>) {
  // ── Permission-filtered columns (physically excluded) ──────────────────────
  const permittedColumns = useMemo(
    () =>
      allColumns.filter((col) => {
        if (!col.permission) return true;
        return permissions.includes(col.permission);
      }),
    [allColumns, permissions]
  );

  // ── Column visibility state ────────────────────────────────────────────────
  const defaultVisibleIds = useMemo(
    () =>
      permittedColumns
        .filter((col) => col.defaultVisible !== false)
        .map((col) => col.id),
    [permittedColumns]
  );

  const [visibleColumnIds, setVisibleColumnIds] = useState<Set<string>>(
    () => new Set(defaultVisibleIds)
  );

  const visibleColumns = useMemo(
    () => permittedColumns.filter((col) => visibleColumnIds.has(col.id)),
    [permittedColumns, visibleColumnIds]
  );

  // ── Table state ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null
  );
  const [filters, setFilters] = useState<Record<string, string>>({});

  const [result, setResult] = useState<DataTableResult<TData>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: defaultPageSize,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Debounce search ────────────────────────────────────────────────────────
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search change
    }, 300);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [search]);

  // ── Build config ───────────────────────────────────────────────────────────
  const config: DataTableConfig = useMemo(
    () => ({
      page,
      pageSize,
      search: debouncedSearch,
      sortField,
      sortDirection,
      filters,
      visibleColumns: Array.from(visibleColumnIds),
    }),
    [
      page,
      pageSize,
      debouncedSearch,
      sortField,
      sortDirection,
      filters,
      visibleColumnIds,
    ]
  );

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetchAction(config);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error || "Failed to fetch data.");
      }
    } catch (err) {
      console.error("DataTable fetch error:", err);
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchAction, config]);

  // ── Refetch on dependency change ───────────────────────────────────────────
  // Track the previous config to avoid infinite loops
  const prevConfigRef = useRef<string>("");

  useEffect(() => {
    const configKey = JSON.stringify(config);
    if (configKey !== prevConfigRef.current) {
      prevConfigRef.current = configKey;
      fetchData();
    }
  }, [config, fetchData]);

  // ── Sort handlers ──────────────────────────────────────────────────────────
  const handleSort = (columnId: string) => {
    if (sortField === columnId) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(columnId);
      setSortDirection("asc");
    }
    setPage(1);
  };

  // ── Filter handlers ────────────────────────────────────────────────────────
  const handleFilterChange = (columnId: string, value: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value === "") {
        delete next[columnId];
      } else {
        next[columnId] = value;
      }
      return next;
    });
    setPage(1);
  };

  // ── Column visibility handlers ─────────────────────────────────────────────
  const handleToggleColumn = (columnId: string) => {
    setVisibleColumnIds((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        // Don't allow hiding all columns
        if (next.size > 1) {
          next.delete(columnId);
        }
      } else {
        next.add(columnId);
      }
      return next;
    });
  };

  const handleShowAllColumns = () => {
    setVisibleColumnIds(new Set(permittedColumns.map((col) => col.id)));
  };

  const handleResetColumns = () => {
    setVisibleColumnIds(new Set(defaultVisibleIds));
  };

  // ── Pagination handlers ────────────────────────────────────────────────────
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  // ── Export handler ─────────────────────────────────────────────────────────
  const canExport =
    exportPermission &&
    permissions.includes(exportPermission) &&
    !!exportAction;

  const handleExport = async () => {
    if (!exportAction || !canExport) return;

    setIsExporting(true);
    try {
      const res = await exportAction(config);
      if (res.success && res.data) {
        // Trigger browser download
        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `export-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        console.error("Export failed:", res.error);
      }
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // ── Prepare toolbar data ───────────────────────────────────────────────────
  const filterConfigs: FilterConfig[] = permittedColumns
    .filter((col) => col.filterable && col.filterOptions)
    .map((col) => ({
      columnId: col.id,
      header: col.header,
      options: col.filterOptions!,
      value: filters[col.id] || "",
    }));

  const columnToggleItems = permittedColumns.map((col) => ({
    id: col.id,
    header: col.header,
    visible: visibleColumnIds.has(col.id),
    isCustomField: col.isCustomField,
  }));

  // ── Sort icon ──────────────────────────────────────────────────────────────
  const renderSortIcon = (col: DataTableColumnDef<TData>) => {
    if (!col.sortable) return null;

    const isSorted = sortField === col.id;

    if (!isSorted) {
      return <ArrowUpDown className="ml-1.5 inline h-3 w-3 text-slate-600" />;
    }

    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1.5 inline h-3 w-3 text-indigo-400" />
    ) : (
      <ArrowDown className="ml-1.5 inline h-3 w-3 text-indigo-400" />
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <DataTableToolbar
        search={search}
        onSearchChange={setSearch}
        filters={filterConfigs}
        onFilterChange={handleFilterChange}
        columnToggleItems={columnToggleItems}
        onToggleColumn={handleToggleColumn}
        onShowAllColumns={handleShowAllColumns}
        onResetColumns={handleResetColumns}
        showExport={!!canExport}
        isExporting={isExporting}
        onExport={handleExport}
        createButton={createButton}
        searchPlaceholder={searchPlaceholder}
      />

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-md">
        {isLoading && result.data.length === 0 ? (
          /* ── Full skeleton loading state ── */
          <div className="divide-y divide-slate-800/60">
            {/* Skeleton header */}
            <div className="flex items-center space-x-4 bg-slate-950/50 px-4 py-3.5">
              {visibleColumns.map((col) => (
                <div
                  key={col.id}
                  className="h-3 flex-1 animate-pulse rounded bg-slate-800"
                />
              ))}
            </div>
            {/* Skeleton rows */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 px-4 py-3.5">
                {visibleColumns.map((col) => (
                  <div
                    key={col.id}
                    className="h-3 flex-1 animate-pulse rounded bg-slate-800/60"
                    style={{
                      animationDelay: `${i * 50}ms`,
                      maxWidth: `${60 + Math.random() * 40}%`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : result.data.length === 0 && !isLoading ? (
          /* ── Empty state ── */
          <div className="space-y-3 p-12 text-center">
            {emptyIcon && (
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
                {emptyIcon}
              </div>
            )}
            <h3 className="text-base font-semibold text-slate-200">
              {emptyTitle}
            </h3>
            <p className="mx-auto max-w-sm text-xs text-slate-400">
              {emptyDescription}
            </p>
          </div>
        ) : (
          /* ── Data table ── */
          <div className="relative overflow-x-auto">
            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/40 backdrop-blur-[1px]">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
              </div>
            )}

            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  {visibleColumns.map((col) => (
                    <th
                      key={col.id}
                      className={`px-4 py-3.5 ${
                        col.sortable
                          ? "cursor-pointer transition-colors select-none hover:text-slate-200"
                          : ""
                      }`}
                      onClick={() => col.sortable && handleSort(col.id)}
                    >
                      <span className="inline-flex items-center">
                        {col.header}
                        {renderSortIcon(col)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {result.data.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="group transition-colors hover:bg-slate-800/40"
                  >
                    {visibleColumns.map((col) => (
                      <td key={col.id} className="px-4 py-3.5">
                        {col.cell
                          ? col.cell(row)
                          : col.accessorKey
                            ? String(getNestedValue(row, col.accessorKey) ?? "")
                            : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {result.total > 0 && (
          <DataTablePagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            totalPages={result.totalPages}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>
    </div>
  );
}
