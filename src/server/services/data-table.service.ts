/**
 * Data Table Service — shared helpers for paginated queries and CSV export.
 *
 * Consumed by module-specific services (department, program, student, etc.)
 * to keep pagination/sorting/filtering/export logic DRY.
 */

import type {
  DataTableColumnDef,
  DataTableConfig,
} from "@/components/tables/data-table.types";

// ─── Pagination Query Builder ────────────────────────────────────────────────

export interface PaginatedQueryOptions {
  /** Prisma `skip` value */
  skip: number;

  /** Prisma `take` value */
  take: number;

  /** Prisma-compatible orderBy object, or undefined if no sort */
  orderBy: Record<string, "asc" | "desc"> | undefined;

  /** The sanitized search term (trimmed, lowercased), or undefined */
  searchTerm: string | undefined;
}

/**
 * Translates a DataTableConfig into Prisma-compatible pagination parameters.
 *
 * @param config — The client-side table state
 * @returns Pagination query options for Prisma
 */
export function buildPaginatedQuery(
  config: DataTableConfig
): PaginatedQueryOptions {
  const page = Math.max(1, config.page);
  const pageSize = Math.max(1, Math.min(100, config.pageSize));
  const skip = (page - 1) * pageSize;

  let orderBy: Record<string, "asc" | "desc"> | undefined;
  if (config.sortField && config.sortDirection) {
    orderBy = { [config.sortField]: config.sortDirection };
  }

  const rawSearch = config.search?.trim();
  const searchTerm = rawSearch && rawSearch.length > 0 ? rawSearch : undefined;

  return { skip, take: pageSize, orderBy, searchTerm };
}

// ─── CSV Export Builder ──────────────────────────────────────────────────────

/**
 * Resolves a dot-path accessor (e.g. "program.name") to a value on a data row.
 */
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

/**
 * Escapes a value for CSV output (handles commas, quotes, newlines).
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  const str = String(value);

  // If the value contains a comma, quote, or newline, wrap in quotes and escape internal quotes
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Builds a CSV string from data rows and column definitions,
 * respecting visible-column and permission filtering.
 *
 * @param rows — The data rows to export
 * @param allColumns — Full column definitions (before filtering)
 * @param visibleColumnIds — IDs of columns the user has toggled visible
 * @param userPermissions — Permission codes the current user has
 * @returns CSV string ready for download
 */
export function buildCsvExport<TData>(
  rows: TData[],
  allColumns: DataTableColumnDef<TData>[],
  visibleColumnIds: string[],
  userPermissions: string[]
): string {
  // 1. Filter columns: must be permitted AND visible, exclude action-only columns (no accessorKey and no exportAccessor)
  const exportColumns = allColumns.filter((col) => {
    // Permission check
    if (col.permission && !userPermissions.includes(col.permission))
      return false;

    // Must be in visible columns list
    if (!visibleColumnIds.includes(col.id)) return false;

    // Must have some way to extract a value for CSV
    if (!col.accessorKey && !col.exportAccessor) return false;

    return true;
  });

  if (exportColumns.length === 0) return "";

  // 2. Build header row
  const headerRow = exportColumns
    .map((col) => escapeCsvValue(col.header))
    .join(",");

  // 3. Build data rows
  const dataRows = rows.map((row) => {
    return exportColumns
      .map((col) => {
        let value: unknown;

        if (col.exportAccessor) {
          value = col.exportAccessor(row);
        } else if (col.accessorKey) {
          value = getNestedValue(row, col.accessorKey);
        }

        return escapeCsvValue(value);
      })
      .join(",");
  });

  return [headerRow, ...dataRows].join("\n");
}
