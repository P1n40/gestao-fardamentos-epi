"use server";

import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { ensureDefaultAccessProfiles } from "@/lib/rbac";
import { CreateUserSchema, UpdateUserSchema, UserRoleSchema } from "@/types/schemas";

const USERS_PATH = "/configuracoes/usuarios";

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getUserWritePayload(formData: FormData) {
  return {
    name: getFormString(formData, "name"),
    email: getFormString(formData, "email"),
    password: getFormString(formData, "password"),
    role: getFormString(formData, "role"),
    active: getFormString(formData, "active"),
  };
}

function isKnownPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

export async function createUser(formData: FormData) {
  const session = await requirePermission("MANAGE_USERS", true);
  const parsed = CreateUserSchema.safeParse(getUserWritePayload(formData));

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await ensureDefaultAccessProfiles();

  try {
    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: hashedPassword,
        role: parsed.data.role,
        active: parsed.data.active,
        profile: {
          connect: {
            role: parsed.data.role,
          },
        },
      },
    });

    await logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      details: `Usuario ${user.email} criado`,
      newValue: {
        name: user.name,
        email: user.email,
        role: user.role,
        profileId: user.profileId,
        active: user.active,
      },
    });

    revalidatePath(USERS_PATH);
    return { success: true };
  } catch (error) {
    if (isKnownPrismaError(error, "P2002")) {
      return { error: "Ja existe um usuario cadastrado com este e-mail." };
    }

    return {
      error: error instanceof Error ? error.message : "Erro ao criar usuario.",
    };
  }
}

export async function updateUser(userId: string, formData: FormData) {
  const session = await requirePermission("MANAGE_USERS", true);
  const parsed = UpdateUserSchema.safeParse(getUserWritePayload(formData));

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return { error: "Usuario nao encontrado." };
  }

  if (user.id === session.user.id && !parsed.data.active) {
    await logAudit({
      userId: session.user.id,
      action: "BLOCKED_USER_UPDATE",
      entity: "User",
      entityId: userId,
      details: "Tentativa de desativar a propria conta",
    });
    return { error: "Voce nao pode desativar sua propria conta." };
  }

  if (user.id === session.user.id && user.role !== parsed.data.role) {
    await logAudit({
      userId: session.user.id,
      action: "BLOCKED_USER_UPDATE",
      entity: "User",
      entityId: userId,
      details: "Tentativa de alterar o proprio perfil de acesso",
      metadata: { targetRole: parsed.data.role },
    });
    return { error: "Voce nao pode alterar o seu proprio perfil de acesso." };
  }

  await ensureDefaultAccessProfiles();

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
        active: parsed.data.active,
        ...(parsed.data.password ? { password: await bcrypt.hash(parsed.data.password, 10) } : {}),
        profile: {
          connect: {
            role: parsed.data.role,
          },
        },
      },
    });

    await logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "User",
      entityId: userId,
      oldValue: {
        name: user.name,
        email: user.email,
        role: user.role,
        profileId: user.profileId,
        active: user.active,
      },
      newValue: {
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        profileId: updatedUser.profileId,
        active: updatedUser.active,
        passwordChanged: Boolean(parsed.data.password),
      },
    });

    revalidatePath(USERS_PATH);
    return { success: true };
  } catch (error) {
    if (isKnownPrismaError(error, "P2002")) {
      return { error: "Ja existe um usuario cadastrado com este e-mail." };
    }

    return {
      error: error instanceof Error ? error.message : "Erro ao atualizar usuario.",
    };
  }
}

export async function deleteUser(userId: string) {
  const session = await requirePermission("MANAGE_USERS", true);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return { error: "Usuario nao encontrado." };
  }

  if (user.id === session.user.id) {
    await logAudit({
      userId: session.user.id,
      action: "BLOCKED_USER_DELETE",
      entity: "User",
      entityId: userId,
      details: "Tentativa de excluir a propria conta",
    });
    return { error: "Voce nao pode excluir sua propria conta." };
  }

  try {
    await prisma.user.delete({
      where: { id: userId },
    });

    await logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "User",
      entityId: userId,
      details: `Usuario ${user.email} excluido`,
      oldValue: {
        name: user.name,
        email: user.email,
        role: user.role,
        profileId: user.profileId,
        active: user.active,
      },
    });

    revalidatePath(USERS_PATH);
    return { success: true };
  } catch (error) {
    if (isKnownPrismaError(error, "P2003")) {
      return {
        error:
          "Este usuario possui vinculos no historico do sistema e nao pode ser excluido. Desative a conta para preservar a rastreabilidade.",
      };
    }

    return {
      error: error instanceof Error ? error.message : "Erro ao excluir usuario.",
    };
  }
}

export async function toggleUserStatus(userId: string) {
  const session = await requirePermission("MANAGE_USERS", true);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return { error: "Usuario nao encontrado." };
  }

  if (user.id === session.user.id) {
    await logAudit({
      userId: session.user.id,
      action: "BLOCKED_USER_UPDATE",
      entity: "User",
      entityId: userId,
      details: "Tentativa de desativar a propria conta",
    });
    return { error: "Voce nao pode desativar sua propria conta." };
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

  revalidatePath(USERS_PATH);

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
    return { error: "Usuario nao encontrado." };
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
    return { error: "Voce nao pode alterar o seu proprio perfil de acesso." };
  }

  await ensureDefaultAccessProfiles();

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      role: parsedRole.data,
      profile: {
        connect: {
          role: parsedRole.data,
        },
      },
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE",
    entity: "User",
    entityId: userId,
    oldValue: { role: user.role, profileId: user.profileId },
    newValue: { role: updatedUser.role, profileId: updatedUser.profileId },
  });

  revalidatePath(USERS_PATH);

  return { success: true };
}
