import { UserRole } from "@prisma/client";

export type Permission =
  | "MANAGE_USERS"
  | "MANAGE_POSITIONS"
  | "MANAGE_EMPLOYEES"
  | "MANAGE_MATERIALS"
  | "MANAGE_ASSIGNMENTS"
  | "MANAGE_DELIVERIES"
  | "VIEW_DASHBOARD"
  | "VIEW_AUDIT_LOGS"
  | "VIEW_REPORTS";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "MANAGE_USERS",
    "MANAGE_POSITIONS",
    "MANAGE_EMPLOYEES",
    "MANAGE_MATERIALS",
    "MANAGE_ASSIGNMENTS",
    "MANAGE_DELIVERIES",
    "VIEW_DASHBOARD",
    "VIEW_AUDIT_LOGS",
    "VIEW_REPORTS",
  ],
  RH_ALMOXARIFADO: [
    "MANAGE_POSITIONS",
    "MANAGE_EMPLOYEES",
    "MANAGE_MATERIALS",
    "MANAGE_ASSIGNMENTS",
    "MANAGE_DELIVERIES",
    "VIEW_DASHBOARD",
    "VIEW_REPORTS",
  ],
  GESTOR: [
    "VIEW_DASHBOARD",
    "VIEW_AUDIT_LOGS",
    "VIEW_REPORTS",
    "MANAGE_ASSIGNMENTS", // Gestor can approve/view assignments
    "MANAGE_DELIVERIES",
  ],
  OPERADOR: [
    "VIEW_DASHBOARD",
    "MANAGE_ASSIGNMENTS", // Basic delivery recording
    "MANAGE_DELIVERIES",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

const PATH_PERMISSION_RULES: Array<{
  prefix: string;
  permission: Permission;
}> = [
  { prefix: "/dashboard", permission: "VIEW_DASHBOARD" },
  { prefix: "/usuarios", permission: "MANAGE_USERS" },
  { prefix: "/auditoria", permission: "VIEW_AUDIT_LOGS" },
  { prefix: "/cargos", permission: "MANAGE_POSITIONS" },
  { prefix: "/colaboradores", permission: "MANAGE_EMPLOYEES" },
  { prefix: "/materiais", permission: "MANAGE_MATERIALS" },
  { prefix: "/estoque", permission: "MANAGE_MATERIALS" },
  { prefix: "/entregas", permission: "MANAGE_DELIVERIES" },
];

export function getRequiredPermissionForPath(path: string): Permission | null {
  const match = PATH_PERMISSION_RULES.find((rule) => path.startsWith(rule.prefix));
  return match?.permission ?? null;
}

export function canAccessPath(role: UserRole, path: string): boolean {
  if (!role) {
    return false;
  }

  if (role === "ADMIN") {
    return true;
  }

  if (path.startsWith("/admin")) {
    return false;
  }

  const requiredPermission = getRequiredPermissionForPath(path);
  if (!requiredPermission) {
    return true;
  }

  return hasPermission(role, requiredPermission);
}
