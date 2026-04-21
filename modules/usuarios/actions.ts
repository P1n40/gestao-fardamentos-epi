"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { UserRoleSchema } from "@/types/schemas";

export async function toggleUserStatus(userId: string) {
  const session = await requirePermission("MANAGE_USERS", true);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("Usuario nao encontrado.");
  }

  if (user.id === session.user.id) {
    await logAudit({
      userId: session.user.id,
      action: "BLOCKED_USER_UPDATE",
      entity: "User",
      entityId: userId,
      details: "Tentativa de desativar a propria conta",
    });
    throw new Error("Voce nao pode desativar sua propria conta.");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { active: !user.active },
  });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "User",
    entityId: userId,
    oldValue: { active: user.active },
    newValue: { active: updatedUser.active },
  });

  revalidatePath("/usuarios");

  return { success: true };
}

export async function updateUserRole(userId: string, newRole: unknown) {
  const session = await requirePermission("MANAGE_USERS", true);
  const parsedRole = UserRoleSchema.safeParse(newRole);

  if (!parsedRole.success) {
    return { error: "Perfil de usuario invalido." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("Usuario nao encontrado.");
  }

  if (user.id === session.user.id) {
    await logAudit({
      userId: session.user.id,
      action: "BLOCKED_USER_UPDATE",
      entity: "User",
      entityId: userId,
      details: "Tentativa de alterar o proprio perfil de acesso",
      metadata: { targetRole: parsedRole.data },
    });
    throw new Error("Voce nao pode alterar o seu proprio perfil de acesso.");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role: parsedRole.data },
  });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "User",
    entityId: userId,
    oldValue: { role: user.role },
    newValue: { role: updatedUser.role },
  });

  revalidatePath("/usuarios");

  return { success: true };
}
