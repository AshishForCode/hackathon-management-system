import { NextRequest } from "next/server";
import { HackathonService, HackathonFilters } from "@/lib/services/hackathon.service";
import { requirePermission } from "@/lib/auth/session";
import { createHackathonSchema } from "@/lib/validators/hackathon.schema";
import { apiSuccess, apiError, parsePagination } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";
import { HackathonMode, HackathonStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pagination = parsePagination(searchParams);

    const filters: HackathonFilters = {
      status: searchParams.get("status") as HackathonStatus | undefined,
      campusId: searchParams.get("campusId") || undefined,
      mode: searchParams.get("mode") as HackathonMode | undefined,
      search: searchParams.get("search") || undefined,
      isInterCampus: searchParams.get("isInterCampus")
        ? searchParams.get("isInterCampus") === "true"
        : undefined,
    };

    const { items, total } = await HackathonService.listHackathons(filters, pagination);

    return apiSuccess(items, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.ceil(total / pagination.pageSize),
    });
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve hackathons", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    // RBAC: Requires hackathon:create permission (Super Admin or Campus Admin)
    const user = await requirePermission("hackathon:create");

    const body = await req.json();
    const parsed = createHackathonSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid hackathon data",
        400,
        parsed.error.errors
      );
    }

    const hackathon = await HackathonService.createHackathon(user, parsed.data);
    return apiSuccess(hackathon, undefined, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode, error.details);
    }
    return apiError("INTERNAL_ERROR", "Failed to create hackathon", 500);
  }
}
