import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "./auth-options";
import { logAudit } from "./audit";
import { Permission, hasPermission } from "./auth-utils";

async function auditAccessDenied(params: {
  userId?: string;
  action: "ACCESS_DENIED_PERMISSION" | "ACCESS_DENIED_ROLE" | "API_ACCESS_DENIED";
  details: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await logAudit({
      userId: params.userId,
      action: params.action,
      entity: "Authorization",
      details: params.details,
      metadata: params.metadata,
    });
  } catch {
    // Access control must keep working even if audit logging fails.
  }
}

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/login");
  }
  return session;
}

export async function requirePermission(permission: Permission, isServerAction = false) {
  const session = await requireAuth();
  const role = session.user.role as UserRole;

  if (!hasPermission(role, permission)) {
    await auditAccessDenied({
      userId: session.user.id,
      action: "ACCESS_DENIED_PERMISSION",
      details: `Tentativa sem permissao: ${permission}`,
      metadata: {
        permission,
        role,
        isServerAction,
      },
    });

    if (isServerAction) {
      throw new Error("Acesso negado: permissao insuficiente.");
    }
    redirect("/unauthorized");
  }

  return session;
}

export async function requireRole(roles: UserRole[], isServerAction = false) {
  const session = await requireAuth();
  const role = session.user.role as UserRole;

  if (!roles.includes(role)) {
    await auditAccessDenied({
      userId: session.user.id,
      action: "ACCESS_DENIED_ROLE",
      details: "Tentativa com perfil sem acesso autorizado",
      metadata: {
        role,
        allowedRoles: roles,
        isServerAction,
      },
    });

    if (isServerAction) {
      throw new Error("Acesso negado: perfil sem permissao.");
    }
    redirect("/unauthorized");
  }

  return session;
}

export async function checkApiAuth(permission?: Permission) {
  const session = await getSession();

  if (!session) {
    await auditAccessDenied({
      action: "API_ACCESS_DENIED",
      details: "Tentativa de acesso API sem autenticacao",
      metadata: { permission: permission || null },
    });
    return { authorized: false, status: 401, message: "Nao autenticado" };
  }

  if (permission) {
    const role = session.user.role as UserRole;
    if (!hasPermission(role, permission)) {
      await auditAccessDenied({
        userId: session.user.id,
        action: "API_ACCESS_DENIED",
        details: `Tentativa de acesso API sem permissao: ${permission}`,
        metadata: { permission, role },
      });
      return { authorized: false, status: 403, message: "Acesso proibido" };
    }
  }

  return { authorized: true, session };
}
