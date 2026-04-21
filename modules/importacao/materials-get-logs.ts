import { requirePermission } from "@/lib/auth-server";
import prisma from "@/lib/prisma";

export async function getRecentMaterialImportLogs() {
  await requirePermission("MANAGE_MATERIALS");

  const logs = await prisma.auditLog.findMany({
    where: {
      action: "IMPORT",
      entity: "MaterialBatch",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return logs.map((log) => ({
    ...log,
    newValue: log.newValue ? JSON.stringify(log.newValue) : null,
    user: log.user
      ? {
          name: log.user.name,
          email: log.user.email,
        }
      : {
          name: null,
          email: "sistema@local",
        },
  }));
}
