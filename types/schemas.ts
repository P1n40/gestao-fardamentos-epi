import { UserRole } from "@prisma/client";
import { z } from "zod";

export const MaterialSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  category: z.enum(["UNIFORM", "PPE"]),
  caNumber: z.string().optional(),
  unit: z.string().default("UN"),
  size: z.string().optional(),
  sku: z.string().optional(),
  stock: z.number().int().nonnegative("O estoque não pode ser negativo"),
  minStock: z.number().int().nonnegative().default(0),
});

export const UserRoleSchema = z.nativeEnum(UserRole);

export const DocumentVersionQuerySchema = z.object({
  version: z.coerce.number().int().positive().optional(),
});

export const DashboardPeriodSchema = z.enum([
  "current_month",
  "last_30_days",
  "current_quarter",
  "current_year",
  "all_time",
]);

export const DashboardFiltersSchema = z.object({
  department: z.string().trim().min(1).optional(),
  positionId: z.string().trim().min(1).optional(),
  period: DashboardPeriodSchema.default("current_month"),
});

export const EmployeeSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  documentId: z.string().length(11, "CPF deve ter exatamente 11 dígitos"),
  registrationCode: z
    .string()
    .min(1, "Matrícula é obrigatória")
    .nullable()
    .optional()
    .or(z.literal("")),
  department: z.string().optional().nullable(),
  positionId: z.string().min(1, "O cargo é obrigatório"),
  shirtSize: z.string().optional().nullable(),
  pantsSize: z.string().optional().nullable(),
  shoeSize: z.string().optional().nullable(),
  extraSizing: z.any().optional().nullable(),
});

export const AssignmentSchema = z.object({
  employeeId: z.string(),
  materialId: z.string(),
  quantity: z.number().int().positive("A quantidade deve ser positiva"),
  caNumber: z.string().optional().nullable(),
  expiresAt: z.date().optional().nullable(),
  isReplacement: z.boolean().default(false),
});

export const DeliveryItemSchema = z.object({
  materialId: z.string().min(1, "O material é obrigatório"),
  quantity: z.number().int().positive("A quantidade deve ser positiva"),
  isReplacement: z.boolean().default(false),
  caNumber: z.string().optional().nullable(),
});

export const DeliverySchema = z.object({
  employeeId: z.string().min(1, "O colaborador é obrigatório"),
  type: z.enum(["UNIFORM", "PPE"]),
  notes: z.string().optional().nullable(),
  items: z.array(DeliveryItemSchema).min(1, "A entrega deve ter pelo menos um item"),
});

export const PositionSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  requiresUniform: z.boolean().default(true),
  requiresPPE: z.boolean().default(false),
});

export const KitSchema = z.object({
  revisionId: z.string().min(1, "A revisão é obrigatória"),
  materialId: z.string().min(1, "O material é obrigatório"),
  quantity: z.number().int().positive("A quantidade deve ser positiva"),
  periodDays: z.number().int().nonnegative().optional().nullable(),
  mandatory: z.boolean().default(true),
});

export const KitRevisionSchema = z.object({
  positionId: z.string().min(1, "O cargo é obrigatório"),
  notes: z.string().optional().nullable(),
  validFrom: z
    .date()
    .optional()
    .default(() => new Date()),
});

export const StockMovementSchema = z.object({
  materialId: z.string().min(1, "O material é obrigatório"),
  type: z.enum(["INPUT", "OUTPUT", "ADJUSTMENT"]),
  quantity: z.number().int("A quantidade deve ser um número inteiro"),
  reason: z.string().min(3, "O motivo deve ter pelo menos 3 caracteres"),
  notes: z.string().optional().nullable(),
});

export const DocumentSchema = z.object({
  type: z.enum(["UNIFORM", "PPE"]),
  employeeId: z.string().min(1, "O colaborador é obrigatório"),
  deliveryId: z.string().optional().nullable(),
  version: z.number().int().positive().default(1),
  fileKey: z.string().optional().nullable(),
  hash: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});
