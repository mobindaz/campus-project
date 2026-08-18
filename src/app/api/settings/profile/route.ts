import { NextResponse } from "next/server";
import { getSession } from "@/server/services/auth.service";
import { AppError } from "@/server/errors/app-error";
import {
  getCollegeProfileService,
  updateCollegeProfileService,
} from "@/server/services/college-profile.service";

export async function GET() {
  try {
    const session = await getSession();
    const profile = await getCollegeProfileService(session?.user);
    return NextResponse.json({ success: true, data: profile });
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

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json();

    const profile = await updateCollegeProfileService(session?.user, body);
    return NextResponse.json({ success: true, data: profile });
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
