import { NextRequest } from "next/server";
import { RegistrationService } from "@/lib/services/registration.service";
import { requireAuth } from "@/lib/auth/session";
import { registerForHackathonSchema } from "@/lib/validators/registration.schema";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const registration = await RegistrationService.getUserRegistration(id, user.id);
    return apiSuccess(registration);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve registration status", 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    const body = await req.json().catch(() => ({}));
    const parsed = registerForHackathonSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid registration submission",
        400,
        parsed.error.errors
      );
    }

    const registration = await RegistrationService.registerParticipant(id, user, parsed.data);
    return apiSuccess(registration, undefined, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode, error.details);
    }
    return apiError("INTERNAL_ERROR", "Registration failed", 500);
  }
}
