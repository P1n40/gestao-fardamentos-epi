"use client";

import { UserRole } from "@prisma/client";
import { useSession } from "next-auth/react";

import { Permission, hasPermission } from "@/lib/auth-utils";

interface RoleGuardProps {
  children: React.ReactNode;
  permissions?: Permission[];
  roles?: UserRole[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, permissions, roles, fallback = null }: RoleGuardProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return null;
  }

  const user = session?.user;

  if (!user) {
    return fallback;
  }

  const role = user.role;

  if (roles && roles.length > 0) {
    if (roles.includes(role)) {
      return <>{children}</>;
    }
  }

  if (permissions && permissions.length > 0) {
    const hasAllPermissions = permissions.every((p) => hasPermission(role, p));
    if (hasAllPermissions) {
      return <>{children}</>;
    }
    return fallback;
  }

  // If no roles or permissions specified, but user is logged in
  if (!roles && !permissions) {
    return <>{children}</>;
  }

  return fallback;
}
