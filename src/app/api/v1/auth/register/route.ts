import { NextRequest } from "next/server";
import { UserService } from "@/lib/services/user.service";
import { registerSchema } from "@/lib/validators/auth.schema";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";
import { checkRateLimit, AUTH_RATE_LIMIT } from "@/lib/utils/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Rate limit registration by client IP
    const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const limit = checkRateLimit(`register_${clientIp}`, AUTH_RATE_LIMIT);
    if (!limit.allowed) {
      return apiError("RATE_LIMITED", "Too many registration attempts. Please try again later.", 429);
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "Invalid registration form submission",
        400,
        parsed.error.errors
      );
    }

    const user = await UserService.registerUser(parsed.data);
    return apiSuccess(user, undefined, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode, error.details);
    }
    return apiError("INTERNAL_ERROR", "Registration failed. Please try again.", 500);
  }
}
