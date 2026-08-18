import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileKey = searchParams.get("key") || "logos/logo.png";

    // In local dev mock mode, return a dummy public URL for logo testing
    return NextResponse.json({
      success: true,
      message: "Mock file uploaded successfully",
      publicUrl: `/uploads/${fileKey}`,
      fileKey,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Mock upload failed" },
      { status: 500 }
    );
  }
}
