import { UserRole } from "@prisma/client";

export type Permission =
  | "MANAGE_USERS"
  | "MANAGE_PROFILES"
  | "MANAGE_SYSTEM_MAINTENANCE"
  | "VIEW_SECURITY_AUDIT"
  | "MANAGE_POSITIONS"
  | "MANAGE_EMPLOYEES"
  | "MANAGE_MATERIALS"
  | "MANAGE_ASSIGNMENTS"
  | "MANAGE_DELIVERIES"
  | "VIEW_DASHBOARD"
  | "VIEW_AUDIT_LOGS"
  | "VIEW_REPORTS"
  | "ESTOQUE_INICIALIZAR"
  | "ESTOQUE_ZERAR"
  | "FUNCIONARIOS_ZERAR";

export const PERMISSION_DEFINITIONS: Array<{
  code: Permission;
  route: string;
  action: string;
  description: string;
}> = [
  {
    code: "VIEW_DASHBOARD",
    route: "/dashboard",
    action: "visualizar",
    description: "Visualizar dashboard",
  },
  {
    code: "VIEW_REPORTS",
    route: "/relatorios",
    action: "visualizar",
    description: "Visualizar relatórios",
  },
  {
    code: "VIEW_AUDIT_LOGS",
    route: "/auditoria",
    action: "visualizar",
    description: "Visualizar auditoria",
  },
  {
    code: "VIEW_SECURITY_AUDIT",
    route: "/configuracoes/auditoria-seguranca",
    action: "visualizar",
    description: "Visualizar auditoria e segurança",
  },
  {
    code: "MANAGE_USERS",
    route: "/configuracoes/usuarios",
    action: "editar",
    description: "Gerenciar usuários",
  },
  {
    code: "MANAGE_PROFILES",
    route: "/configuracoes/perfis",
    action: "editar",
    description: "Gerenciar perfis e permissões",
  },
  {
    code: "MANAGE_SYSTEM_MAINTENANCE",
    route: "/configuracoes/manutencao",
    action: "editar",
    description: "Executar manutenção do sistema",
  },
  {
    code: "MANAGE_POSITIONS",
    route: "/cargos",
    action: "editar",
    description: "Gerenciar cargos e kits",
  },
  {
    code: "MANAGE_EMPLOYEES",
    route: "/colaboradores",
    action: "editar",
    description: "Gerenciar colaboradores",
  },
  {
    code: "MANAGE_MATERIALS",
    route: "/estoque",
    action: "editar",
    description: "Gerenciar materiais e estoque",
  },
  {
    code: "MANAGE_ASSIGNMENTS",
    route: "/entregas",
    action: "editar",
    description: "Gerenciar atribuições",
  },
  {
    code: "MANAGE_DELIVERIES",
    route: "/entregas",
    action: "criar",
    description: "Registrar entregas",
  },
  {
    code: "ESTOQUE_INICIALIZAR",
    route: "/estoque",
    action: "inicializar",
    description: "Executar entrada inicial oficial de estoque",
  },
  {
    code: "ESTOQUE_ZERAR",
    route: "/configuracoes/manutencao",
    action: "zerar",
    description: "Zerar saldos atuais de estoque",
  },
  {
    code: "FUNCIONARIOS_ZERAR",
    route: "/configuracoes/manutencao",
    action: "zerar",
    description: "Zerar base ativa de funcionários",
  },
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "MANAGE_USERS",
    "MANAGE_PROFILES",
    "MANAGE_SYSTEM_MAINTENANCE",
    "VIEW_SECURITY_AUDIT",
    "MANAGE_POSITIONS",
    "MANAGE_EMPLOYEES",
    "MANAGE_MATERIALS",
    "MANAGE_ASSIGNMENTS",
    "MANAGE_DELIVERIES",
    "VIEW_DASHBOARD",
    "VIEW_AUDIT_LOGS",
    "VIEW_REPORTS",
    "ESTOQUE_INICIALIZAR",
    "ESTOQUE_ZERAR",
    "FUNCIONARIOS_ZERAR",
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
  { prefix: "/configuracoes/usuarios", permission: "MANAGE_USERS" },
  { prefix: "/configuracoes/perfis", permission: "MANAGE_PROFILES" },
  { prefix: "/configuracoes/manutencao", permission: "MANAGE_SYSTEM_MAINTENANCE" },
  { prefix: "/configuracoes/auditoria-seguranca", permission: "VIEW_SECURITY_AUDIT" },
  { prefix: "/configuracoes", permission: "MANAGE_USERS" },
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
