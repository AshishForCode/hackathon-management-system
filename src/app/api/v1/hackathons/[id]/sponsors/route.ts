import { NextRequest } from "next/server";
import { HackathonService } from "@/lib/services/hackathon.service";
import { requirePermission } from "@/lib/auth/session";
import { sponsorInputSchema } from "@/lib/validators/hackathon.schema";
import { apiSuccess, apiError } from "@/lib/utils/api-response";
import { AppError } from "@/lib/utils/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requirePermission("hackathon:update");

    const body = await req.json();
    const parsed = sponsorInputSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid sponsor data", 400);
    }

    const sponsor = await HackathonService.addSponsor(id, user, parsed.data);
    return apiSuccess(sponsor, undefined, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return apiError(error.code, error.message, error.statusCode);
    }
    return apiError("INTERNAL_ERROR", "Failed to add sponsor", 500);
  }
}
