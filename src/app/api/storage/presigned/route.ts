import { NextResponse } from "next/server";
import { AppError } from "@/server/errors/app-error";
import { getUploadPresignedUrl } from "@/server/storage";

export async function POST(request: Request) {
  try {
    const { filename, contentType, folder } = await request.json();

    if (!filename || typeof filename !== "string") {
      return NextResponse.json(
        { success: false, error: "Filename is required." },
        { status: 400 }
      );
    }

    const result = await getUploadPresignedUrl(
      filename,
      contentType || "image/png",
      folder || "logos"
    );

    return NextResponse.json({ success: true, data: result });
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
