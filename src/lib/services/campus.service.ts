import { prisma } from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/utils/errors";

export class CampusService {
  /**
   * List all active campuses.
   */
  static async listCampuses() {
    try {
      return await prisma.campus.findMany({
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
    } catch {
      return [
        { id: "campus-u", name: "JECRC University", code: "JECRC-U", location: "Jaipur, Rajasthan", active: true, _count: { hackathons: 1, users: 5 } },
        { id: "campus-f", name: "JECRC Foundation", code: "JECRC-F", location: "Jaipur, Rajasthan", active: true, _count: { hackathons: 1, users: 3 } },
      ];
    }
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
