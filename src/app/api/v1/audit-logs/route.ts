import { NextRequest } from "next/server";
import { AuditService } from "@/lib/services/audit.service";
import { requireAuth } from "@/lib/auth/session";
import { apiSuccess, apiError, parsePagination } from "@/lib/utils/api-response";
import { AppError, ForbiddenError } from "@/lib/utils/errors";
import { UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.CAMPUS_ADMIN) {
      throw new ForbiddenError("Only administrators can view audit logs.");
    }

    const { searchParams } = new URL(req.url);
    const { page, pageSize, skip, take } = parsePagination(searchParams);

    const action = searchParams.get("action") || undefined;
    const entity = searchParams.get("entity") || undefined;
    const userId = searchParams.get("userId") || undefined;

    const data = await AuditService.listAuditLogs({
      action,
      entity,
      userId,
      skip,
      take,
    });

    const totalPages = Math.ceil(data.total / pageSize);

    return apiSuccess(data.items, {
      page,
      pageSize,
      total: data.total,
      totalPages,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve audit logs", 500);
  }
}
