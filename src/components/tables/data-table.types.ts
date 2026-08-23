import { type ReactNode } from "react";

// ─── Column Definition ───────────────────────────────────────────────────────

export interface DataTableColumnDef<TData> {
  /** Unique column identifier */
  id: string;

  /** Display header label */
  header: string;

  /**
   * Dot-path key into row data for simple value access.
   * Used by default cell renderer and CSV export when no custom accessor is provided.
   */
  accessorKey?: string;

  /**
   * Custom cell renderer. Receives the full row and returns a ReactNode.
   * If not provided, the raw value from `accessorKey` is displayed as text.
   */
  cell?: (row: TData) => ReactNode;

  /** Whether this column supports server-side sorting */
  sortable?: boolean;

  /** Whether this column has a filter dropdown */
  filterable?: boolean;

  /** Options for the filter dropdown. Required when `filterable` is true. */
  filterOptions?: { label: string; value: string }[];

  /**
   * Permission code required to see this column.
   * If the current user lacks this permission, the column is physically excluded
   * from rendering, the column toggle, and CSV export — not just CSS-hidden.
   */
  permission?: string;

  /** Whether this column is visible by default. Defaults to true. */
  defaultVisible?: boolean;

  /**
   * Custom value extractor for CSV export.
   * If not provided, `accessorKey` is used to extract the raw value.
   */
  exportAccessor?: (row: TData) => string | number | boolean | null | undefined;

  /** Flag indicating this column originates from a custom field definition */
  isCustomField?: boolean;
}

// ─── Server Query State ──────────────────────────────────────────────────────

export interface DataTableConfig {
  /** Current page number (1-indexed) */
  page: number;

  /** Number of rows per page */
  pageSize: number;

  /** Global search term */
  search: string;

  /** Field to sort by (column id) */
  sortField: string | null;

  /** Sort direction */
  sortDirection: "asc" | "desc" | null;

  /** Column-specific filters: { columnId: filterValue } */
  filters: Record<string, string>;

  /** IDs of columns the user has toggled visible */
  visibleColumns: string[];
}

// ─── Server Response Shape ───────────────────────────────────────────────────

export interface DataTableResult<TData> {
  /** Page of data rows */
  data: TData[];

  /** Total row count matching current search/filter (before pagination) */
  total: number;

  /** Current page number (1-indexed) */
  page: number;

  /** Page size used */
  pageSize: number;

  /** Total number of pages */
  totalPages: number;
}

// ─── Component Props ─────────────────────────────────────────────────────────

export interface DataTableProps<TData> {
  /** Full column definitions (before permission filtering) */
  columns: DataTableColumnDef<TData>[];

  /**
   * Server action that fetches paginated data.
   * Called whenever search/sort/filter/page state changes.
   */
  fetchAction: (
    config: DataTableConfig
  ) => Promise<{
    success: boolean;
    data?: DataTableResult<TData>;
    error?: string;
  }>;

  /**
   * Array of permission codes the current user possesses.
   * Used to filter columns and gate the export button.
   */
  permissions: string[];

  /**
   * Permission code required to see the CSV export button.
   * If the user lacks this permission, the button is not rendered
   * and the export server action will reject with 403.
   */
  exportPermission?: string;

  /**
   * Server action that returns a CSV string for download.
   * Only called when the user has the required export permission.
   */
  exportAction?: (
    config: DataTableConfig
  ) => Promise<{ success: boolean; data?: string; error?: string }>;

  /** Optional create button to display in the toolbar */
  createButton?: ReactNode;

  /** Icon component for empty state */
  emptyIcon?: ReactNode;

  /** Title text for empty state */
  emptyTitle?: string;

  /** Description text for empty state */
  emptyDescription?: string;

  /** Default page size. Defaults to 10. */
  defaultPageSize?: number;

  /** Custom placeholder text for the search input */
  searchPlaceholder?: string;
}
