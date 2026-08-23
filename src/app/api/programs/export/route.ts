import { NextResponse } from "next/server";
import { getSession } from "@/server/services/auth.service";
import { AppError } from "@/server/errors/app-error";
import { exportProgramsCsvService } from "@/server/services/program.service";
import { getUserPermissions } from "@/server/services/rbac.service";
import type { DataTableConfig } from "@/components/tables/data-table.types";

/**
 * GET /api/programs/export
 *
 * Permission-gated CSV export endpoint.
 * Re-checks `programs.export` permission server-side.
 * Returns 403 if user lacks the permission, regardless of how the request arrives.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);

    const config: DataTableConfig = {
      page: 1,
      pageSize: 10000,
      search: searchParams.get("search") || "",
      sortField: searchParams.get("sortField") || null,
      sortDirection:
        (searchParams.get("sortDirection") as "asc" | "desc") || null,
      filters: {},
      visibleColumns:
        searchParams.get("visibleColumns")?.split(",").filter(Boolean) || [],
    };

    const filterType = searchParams.get("filter_type");
    const filterIsActive = searchParams.get("filter_isActive");
    if (filterType) config.filters.type = filterType;
    if (filterIsActive) config.filters.isActive = filterIsActive;

    const userPermissions = session?.user?.id
      ? await getUserPermissions(session.user.id)
      : [];

    const csv = await exportProgramsCsvService(
      session?.user,
      config,
      userPermissions
    );

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="programs-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
