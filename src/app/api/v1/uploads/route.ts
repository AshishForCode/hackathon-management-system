import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { requireAuth } from "@/lib/auth/session";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError, ValidationError } from "@/lib/utils/errors";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/zip",
  "application/x-zip-compressed",
]);

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      throw new ValidationError("No file provided in upload request.");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError("File size exceeds 25 MB limit.");
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw new ValidationError(
        "Invalid file format. Allowed: PDF, PNG, JPG, WEBP, and ZIP."
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    // Sanitize filename and create unique timestamped name
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const baseName = file.name
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
    const uniqueFileName = `${Date.now()}-${baseName}.${ext}`;
    const filePath = join(uploadsDir, uniqueFileName);

    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${uniqueFileName}`;

    return apiSuccess({
      url: fileUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to upload file", 500);
  }
}
