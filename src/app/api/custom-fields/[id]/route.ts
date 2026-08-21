import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/services/auth.service";
import {
  updateCustomFieldDefinitionService,
  deleteCustomFieldDefinitionService,
} from "@/server/services/custom-field.service";
import { AppError } from "@/server/errors/app-error";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id } = await params;
    const body = await request.json();

    const updated = await updateCustomFieldDefinitionService(
      session?.user ?? null,
      id,
      body
    );

    return NextResponse.json({ success: true, data: updated });
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id } = await params;

    const deleted = await deleteCustomFieldDefinitionService(
      session?.user ?? null,
      id
    );

    return NextResponse.json({ success: true, data: deleted });
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
