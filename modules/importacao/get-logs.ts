import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-server";

export async function getRecentImportLogs() {
  await requirePermission("MANAGE_EMPLOYEES");

  const logs = await prisma.auditLog.findMany({
    where: {
      action: "IMPORT",
      entity: "EmployeeBatch",
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
