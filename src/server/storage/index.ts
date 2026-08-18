/**
 * STORAGE ABSTRACTION LAYER (Cloudflare R2 / S3 API Compatible)
 * =============================================================
 * Standardized storage interface for presigned file uploads and asset storage.
 * Per docs/ARCHITECTURE.md §4 (Correction #4):
 * Abstracts Cloudflare R2 / S3-compatible storage with a fallback local handler
 * for development when R2 credentials are not configured.
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface PresignedUrlResult {
  uploadUrl: string;
  publicUrl: string;
  fileKey: string;
  isMock?: boolean;
}

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "campus-assets";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://assets.college.edu";

function getS3Client(): S3Client | null {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Generates a presigned upload URL for client-side direct asset uploads to Cloudflare R2.
 * Falls back to mock local upload endpoint if R2 env variables are absent.
 */
export async function getUploadPresignedUrl(
  filename: string,
  contentType: string,
  folder = "logos"
): Promise<PresignedUrlResult> {
  const sanitizeFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const timestamp = Date.now();
  const fileKey = `${folder}/${timestamp}-${sanitizeFilename}`;

  const client = getS3Client();

  if (!client) {
    // Development fallback mock
    return {
      uploadUrl: `/api/storage/mock-upload?key=${encodeURIComponent(fileKey)}`,
      publicUrl: `/uploads/${fileKey}`,
      fileKey,
      isMock: true,
    };
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
  const publicUrl = `${R2_PUBLIC_URL.replace(/\/$/, "")}/${fileKey}`;

  return {
    uploadUrl,
    publicUrl,
    fileKey,
    isMock: false,
  };
}
