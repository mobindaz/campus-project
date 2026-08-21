import { NextResponse } from "next/server";
import { getSession } from "@/server/services/auth.service";
import { AppError } from "@/server/errors/app-error";
import {
  createDepartmentService,
  listDepartmentsService,
} from "@/server/services/department.service";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || undefined;
    const includeInactive = searchParams.get("includeInactive") === "true";
    const typeStr = searchParams.get("type");
    const type =
      typeStr === "ACADEMIC" || typeStr === "ADMINISTRATIVE"
        ? typeStr
        : undefined;

    const departments = await listDepartmentsService(session?.user, {
      search,
      includeInactive,
      type,
    });

    return NextResponse.json({ success: true, data: departments });
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

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json();

    const department = await createDepartmentService(session?.user, body);
    return NextResponse.json(
      { success: true, data: department },
      { status: 201 }
    );
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
