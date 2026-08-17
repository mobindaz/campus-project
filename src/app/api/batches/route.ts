import { NextResponse } from "next/server";
import { getSession } from "@/server/services/auth.service";
import { AppError } from "@/server/errors/app-error";
import {
  createBatchService,
  listBatchesService,
} from "@/server/services/batch.service";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || undefined;
    const programId = searchParams.get("programId") || undefined;
    const includeInactive = searchParams.get("includeInactive") === "true";

    const batches = await listBatchesService(session?.user, {
      search,
      programId,
      includeInactive,
    });

    return NextResponse.json({ success: true, data: batches });
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

    const batch = await createBatchService(session?.user, body);
    return NextResponse.json({ success: true, data: batch }, { status: 201 });
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
