import { describe, it, expect } from "vitest";
import { buildPaginatedQuery, buildCsvExport } from "./data-table.service";
import type {
  DataTableColumnDef,
  DataTableConfig,
} from "@/components/tables/data-table.types";

// ─── buildPaginatedQuery ─────────────────────────────────────────────────────

describe("buildPaginatedQuery", () => {
  const baseConfig: DataTableConfig = {
    page: 1,
    pageSize: 10,
    search: "",
    sortField: null,
    sortDirection: null,
    filters: {},
    visibleColumns: [],
  };

  it("calculates skip=0, take=10 for page 1 with pageSize 10", () => {
    const result = buildPaginatedQuery(baseConfig);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(10);
  });

  it("calculates correct skip for page 3", () => {
    const result = buildPaginatedQuery({ ...baseConfig, page: 3 });
    expect(result.skip).toBe(20);
    expect(result.take).toBe(10);
  });

  it("clamps page to minimum of 1", () => {
    const result = buildPaginatedQuery({ ...baseConfig, page: -5 });
    expect(result.skip).toBe(0);
  });

  it("clamps pageSize to maximum of 100", () => {
    const result = buildPaginatedQuery({ ...baseConfig, pageSize: 500 });
    expect(result.take).toBe(100);
  });

  it("clamps pageSize to minimum of 1", () => {
    const result = buildPaginatedQuery({ ...baseConfig, pageSize: 0 });
    expect(result.take).toBe(1);
  });

  it("returns orderBy when sortField and sortDirection are set", () => {
    const result = buildPaginatedQuery({
      ...baseConfig,
      sortField: "name",
      sortDirection: "desc",
    });
    expect(result.orderBy).toEqual({ name: "desc" });
  });

  it("returns undefined orderBy when sortField is null", () => {
    const result = buildPaginatedQuery(baseConfig);
    expect(result.orderBy).toBeUndefined();
  });

  it("returns trimmed search term", () => {
    const result = buildPaginatedQuery({
      ...baseConfig,
      search: "  computer science  ",
    });
    expect(result.searchTerm).toBe("computer science");
  });

  it("returns undefined searchTerm for empty/whitespace search", () => {
    const result = buildPaginatedQuery({ ...baseConfig, search: "   " });
    expect(result.searchTerm).toBeUndefined();
  });
});

// ─── buildCsvExport ──────────────────────────────────────────────────────────

interface TestRow {
  id: string;
  name: string;
  code: string;
  type: string;
  isActive: boolean;
  program?: { name: string; code: string } | null;
}

const testColumns: DataTableColumnDef<TestRow>[] = [
  {
    id: "name",
    header: "Name",
    accessorKey: "name",
    sortable: true,
    defaultVisible: true,
  },
  { id: "code", header: "Code", accessorKey: "code", defaultVisible: true },
  { id: "type", header: "Type", accessorKey: "type", defaultVisible: true },
  {
    id: "program",
    header: "Parent Program",
    accessorKey: "program.name",
    exportAccessor: (row) => row.program?.name ?? "None",
    defaultVisible: true,
  },
  {
    id: "status",
    header: "Status",
    accessorKey: "isActive",
    exportAccessor: (row) => (row.isActive ? "Active" : "Inactive"),
    defaultVisible: true,
  },
  {
    id: "secret",
    header: "Secret Column",
    accessorKey: "id",
    permission: "admin.secret",
    defaultVisible: true,
  },
  {
    id: "actions",
    header: "Actions",
    // No accessorKey or exportAccessor — action-only column
    defaultVisible: true,
  },
];

const testRows: TestRow[] = [
  {
    id: "1",
    name: "Computer Science",
    code: "CSE",
    type: "ACADEMIC",
    isActive: true,
    program: { name: "B.Tech", code: "BTECH" },
  },
  {
    id: "2",
    name: "Mechanical Engineering",
    code: "MECH",
    type: "ACADEMIC",
    isActive: false,
    program: null,
  },
];

describe("buildCsvExport", () => {
  it("exports only visible and permitted columns", () => {
    const csv = buildCsvExport(
      testRows,
      testColumns,
      ["name", "code", "type", "program", "status", "actions"],
      [] // no permissions — "secret" column excluded
    );

    const lines = csv.split("\n");
    expect(lines[0]).toBe("Name,Code,Type,Parent Program,Status");
    expect(lines).toHaveLength(3); // header + 2 data rows
  });

  it("excludes columns not in visibleColumns list", () => {
    const csv = buildCsvExport(
      testRows,
      testColumns,
      ["name", "code"], // only 2 columns visible
      []
    );

    const lines = csv.split("\n");
    expect(lines[0]).toBe("Name,Code");
    expect(lines[1]).toBe("Computer Science,CSE");
  });

  it("includes permission-gated column when user has the permission", () => {
    const csv = buildCsvExport(
      testRows,
      testColumns,
      ["name", "secret"],
      ["admin.secret"] // user has the permission
    );

    const lines = csv.split("\n");
    expect(lines[0]).toBe("Name,Secret Column");
    expect(lines[1]).toBe("Computer Science,1");
  });

  it("excludes permission-gated column when user lacks the permission", () => {
    const csv = buildCsvExport(
      testRows,
      testColumns,
      ["name", "secret"],
      [] // no permissions
    );

    const lines = csv.split("\n");
    expect(lines[0]).toBe("Name");
  });

  it("uses exportAccessor when available instead of accessorKey", () => {
    const csv = buildCsvExport(
      testRows,
      testColumns,
      ["program", "status"],
      []
    );

    const lines = csv.split("\n");
    expect(lines[1]).toBe("B.Tech,Active");
    expect(lines[2]).toBe("None,Inactive");
  });

  it("excludes action-only columns (no accessorKey or exportAccessor)", () => {
    const csv = buildCsvExport(testRows, testColumns, ["name", "actions"], []);

    const lines = csv.split("\n");
    expect(lines[0]).toBe("Name");
  });

  it("handles commas and quotes in values", () => {
    const rowWithComma: TestRow[] = [
      {
        id: "3",
        name: 'Computer, "Data" Science',
        code: "CDS",
        type: "ACADEMIC",
        isActive: true,
      },
    ];

    const csv = buildCsvExport(rowWithComma, testColumns, ["name", "code"], []);

    const lines = csv.split("\n");
    expect(lines[1]).toBe('"Computer, ""Data"" Science",CDS');
  });

  it("returns empty string when no exportable columns", () => {
    const csv = buildCsvExport(testRows, testColumns, ["actions"], []);
    expect(csv).toBe("");
  });

  it("resolves nested accessorKey paths (dot notation)", () => {
    const nestedColumns: DataTableColumnDef<TestRow>[] = [
      {
        id: "programName",
        header: "Program Name",
        accessorKey: "program.name",
      },
      {
        id: "programCode",
        header: "Program Code",
        accessorKey: "program.code",
      },
    ];

    const csv = buildCsvExport(
      testRows,
      nestedColumns,
      ["programName", "programCode"],
      []
    );

    const lines = csv.split("\n");
    expect(lines[0]).toBe("Program Name,Program Code");
    expect(lines[1]).toBe("B.Tech,BTECH");
    expect(lines[2]).toBe(","); // null program → empty values
  });
});
