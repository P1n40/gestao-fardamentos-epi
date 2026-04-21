import { UserRole } from "@prisma/client";

import prisma from "@/lib/prisma";

import { Permission, PERMISSION_DEFINITIONS, ROLE_PERMISSIONS } from "./auth-utils";

export function getDefaultPermissionsForRole(role: UserRole) {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function getPermissionDefinition(code: Permission) {
  return PERMISSION_DEFINITIONS.find((permission) => permission.code === code);
}

export async function getUserPermissionCodes(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      profile: {
        select: {
          active: true,
          permissions: {
            select: { code: true },
          },
        },
      },
    },
  });

  if (!user) {
    return [];
  }

  if (user.profile?.active) {
    return user.profile.permissions.map((permission) => permission.code as Permission);
  }

  // Backward-compatible fallback while existing databases are migrated/seeded.
  return getDefaultPermissionsForRole(user.role);
}

export async function userHasPermission(userId: string, permission: Permission) {
  const permissions = await getUserPermissionCodes(userId);
  return permissions.includes(permission);
}

export async function ensureDefaultAccessProfiles() {
  for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS) as Array<
    [UserRole, Permission[]]
  >) {
    const profile = await prisma.accessProfile.upsert({
      where: { role },
      update: {
        name: getProfileName(role),
        active: true,
      },
      create: {
        role,
        name: getProfileName(role),
        description: getProfileDescription(role),
        active: true,
      },
    });

    await prisma.profilePermission.deleteMany({
      where: { profileId: profile.id },
    });

    await prisma.profilePermission.createMany({
      data: permissions.map((code) => {
        const definition = getPermissionDefinition(code);
        return {
          profileId: profile.id,
          code,
          route: definition?.route ?? "/",
          action: definition?.action ?? "executar",
          description: definition?.description ?? code,
        };
      }),
      skipDuplicates: true,
    });

    await prisma.user.updateMany({
      where: {
        role,
        profileId: null,
      },
      data: {
        profileId: profile.id,
      },
    });
  }
}

export function getProfileName(role: UserRole) {
  const names: Record<UserRole, string> = {
    ADMIN: "Administrador",
    RH_ALMOXARIFADO: "RH / Almoxarifado",
    GESTOR: "Gestor",
    OPERADOR: "Operador",
  };

  return names[role];
}

function getProfileDescription(role: UserRole) {
  const descriptions: Record<UserRole, string> = {
    ADMIN: "Acesso administrativo completo, incluindo ações críticas.",
    RH_ALMOXARIFADO: "Operação de RH, colaboradores, materiais e entregas.",
    GESTOR: "Acompanhamento operacional, relatórios e entregas.",
    OPERADOR: "Registro operacional básico de entregas.",
  };

  return descriptions[role];
}
