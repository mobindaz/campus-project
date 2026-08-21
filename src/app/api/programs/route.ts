import { NextResponse } from "next/server";
import { getSession } from "@/server/services/auth.service";
import { AppError } from "@/server/errors/app-error";
import {
  createProgramService,
  listProgramsService,
} from "@/server/services/program.service";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || undefined;
    const includeInactive = searchParams.get("includeInactive") === "true";
    const typeStr = searchParams.get("type");
    const type =
      typeStr === "DEGREE" ||
      typeStr === "DIPLOMA" ||
      typeStr === "POST_GRADUATE" ||
      typeStr === "CERTIFICATE" ||
      typeStr === "DOCTORAL"
        ? typeStr
        : undefined;

    const programs = await listProgramsService(session?.user, {
      search,
      includeInactive,
      type,
    });

    return NextResponse.json({ success: true, data: programs });
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

    const program = await createProgramService(session?.user, body);
    return NextResponse.json({ success: true, data: program }, { status: 201 });
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
