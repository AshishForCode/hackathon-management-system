import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { ValidationError } from "@/lib/utils/errors";

export interface UploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export class UploadService {
  private static readonly MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
  private static readonly ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/zip",
    "application/x-zip-compressed",
  ]);

  /**
   * Validates and saves an uploaded file to public/uploads
   */
  static async handleFileUpload(file: File | null): Promise<UploadResult> {
    if (!file) {
      throw new ValidationError("No file provided in upload request.");
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new ValidationError("File size exceeds 25 MB limit.");
    }

    if (!this.ALLOWED_MIME_TYPES.has(file.type)) {
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

    return {
      url: `/uploads/${uniqueFileName}`,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    };
  }
}
