import { NextRequest, NextResponse } from "next/server";
import { RegistrationService } from "@/lib/services/registration.service";
import { requirePermission } from "@/lib/auth/session";
import { AppError } from "@/lib/utils/errors";
import { apiError } from "@/lib/utils/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requirePermission("registration:export");

    const csvData = await RegistrationService.exportRegistrationsCsv(id, user);

    const filename = `hackathon-${id}-participants-${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to export participants to CSV", 500);
  }
}
