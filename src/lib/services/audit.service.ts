import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export interface AuditLogFilterOptions {
  action?: string;
  entity?: string;
  userId?: string;
  skip?: number;
  take?: number;
}

export class AuditService {
  /**
   * List paginated audit logs for administrators.
   */
  static async listAuditLogs(options: AuditLogFilterOptions = {}) {
    const where: Prisma.AuditLogWhereInput = {
      ...(options.action ? { action: options.action } : {}),
      ...(options.entity ? { entity: options.entity } : {}),
      ...(options.userId ? { userId: options.userId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: options.skip ?? 0,
        take: options.take ?? 25,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              campus: { select: { code: true } },
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  }
}
