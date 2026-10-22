import { NextRequest } from "next/server";
import { ArchiveService } from "@/lib/services/archive.service";
import { apiSuccess, apiError, parsePagination } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { page, pageSize, skip, take } = parsePagination(searchParams);

    const campusCode = searchParams.get("campus") || undefined;
    const hackathonId = searchParams.get("hackathonId") || undefined;
    const winnersOnly = searchParams.get("winnersOnly") === "true";
    const search = searchParams.get("search") || undefined;
    const techStack = searchParams.get("techStack") || undefined;

    const data = await ArchiveService.getProjectArchive({
      campusCode,
      hackathonId,
      winnersOnly,
      search,
      techStack,
      skip,
      take,
    });

    const totalPages = Math.ceil(data.total / pageSize);

    return apiSuccess(data, {
      page,
      pageSize,
      total: data.total,
      totalPages,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve project archive", 500);
  }
}
