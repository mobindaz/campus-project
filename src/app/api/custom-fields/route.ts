import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/services/auth.service";
import {
  listCustomFieldDefinitionsService,
  createCustomFieldDefinitionService,
} from "@/server/services/custom-field.service";
import { AppError } from "@/server/errors/app-error";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get("entityType") || undefined;
    const includeInactive = searchParams.get("includeInactive") === "true";

    const fields = await listCustomFieldDefinitionsService(
      session?.user ?? null,
      entityType,
      includeInactive
    );

    return NextResponse.json({ success: true, data: fields });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const body = await request.json();

    const created = await createCustomFieldDefinitionService(
      session?.user ?? null,
      body
    );

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
