import { NextRequest } from "next/server";
import { RegistrationService } from "@/lib/services/registration.service";
import { requirePermission } from "@/lib/auth/session";
import { updateRegistrationStatusSchema } from "@/lib/validators/registration.schema";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requirePermission("registration:approve");

    const body = await req.json();
    const parsed = updateRegistrationStatusSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid status payload",
        400,
        parsed.error.errors
      );
    }

    const updated = await RegistrationService.updateRegistrationStatus(
      id,
      user,
      parsed.data.status,
      parsed.data.reason
    );

    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to update registration status", 500);
  }
}
