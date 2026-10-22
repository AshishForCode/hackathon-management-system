import { NextRequest } from "next/server";
import { RegistrationService } from "@/lib/services/registration.service";
import { requirePermission } from "@/lib/auth/session";
import { apiSuccess, apiError, parsePagination } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";
import { RegistrationStatus } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requirePermission("registration:read_all");

    const { searchParams } = new URL(req.url);
    const pagination = parsePagination(searchParams);
    const status = searchParams.get("status") as RegistrationStatus | undefined;

    const { items, total } = await RegistrationService.listRegistrations(
      id,
      user,
      status || undefined,
      pagination
    );

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
    return apiError("INTERNAL_ERROR", "Failed to retrieve registrations", 500);
  }
}
