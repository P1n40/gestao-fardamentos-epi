import prisma from "@/lib/prisma";

export async function getAuditLogs(options: {
  userId?: string;
  action?: string;
  entity?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const { userId, action, entity, limit = 50, offset = 0 } = options;

  const where: any = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entity) where.entity = entity;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}

export async function getRecentAuditLogs(limit = 10) {
  return await prisma.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  });
}
