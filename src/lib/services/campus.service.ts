import { prisma } from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/utils/errors";

export class CampusService {
  /**
   * List all active campuses.
   */
  static async listCampuses() {
    return prisma.campus.findMany({
      where: { active: true },
      include: {
        _count: {
          select: {
            hackathons: true,
            users: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Get campus by ID.
   */
  static async getCampusById(id: string) {
    const campus = await prisma.campus.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            hackathons: true,
            users: true,
          },
        },
      },
    });

    if (!campus) {
      throw new NotFoundError("Campus", id);
    }

    return campus;
  }
}
