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

const optionalPasswordSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(8, "A senha deve ter pelo menos 8 caracteres").optional(),
);

const activeFromFormSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    return value === "true" || value === "on";
  }

  return value;
}, z.boolean().default(true));

export const CreateUserSchema = z.object({
  name: z.string().trim().min(2, "O nome deve ter pelo menos 2 caracteres"),
  email: z.string().trim().toLowerCase().email("Informe um e-mail valido"),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
  role: UserRoleSchema,
  active: activeFromFormSchema,
});

export const UpdateUserSchema = z.object({
  name: z.string().trim().min(2, "O nome deve ter pelo menos 2 caracteres"),
  email: z.string().trim().toLowerCase().email("Informe um e-mail valido"),
  password: optionalPasswordSchema,
  role: UserRoleSchema,
  active: activeFromFormSchema,
});

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

export const KitTemplateSchema = z.object({
  name: z.string().trim().min(2, "O nome deve ter pelo menos 2 caracteres"),
  description: z.string().trim().optional().nullable(),
  active: z.boolean().default(true),
});

export const KitTemplateItemSchema = z.object({
  templateId: z.string().min(1, "O modelo de kit e obrigatorio"),
  materialId: z.string().min(1, "O material e obrigatorio"),
  quantity: z.number().int().positive("A quantidade deve ser positiva"),
  periodDays: z.number().int().nonnegative().optional().nullable(),
  mandatory: z.boolean().default(true),
});

export const KitTemplateLinkSchema = z.object({
  templateId: z.string().min(1, "O modelo de kit e obrigatorio"),
  positionId: z.string().min(1, "O cargo e obrigatorio"),
});

export const StockMovementSchema = z.object({
  materialId: z.string().min(1, "O material é obrigatório"),
  type: z.enum(["INPUT", "OUTPUT", "ADJUSTMENT"]),
  quantity: z.number().int("A quantidade deve ser um número inteiro"),
  reason: z.string().min(3, "O motivo deve ter pelo menos 3 caracteres"),
  notes: z.string().optional().nullable(),
});

export const ExplicitConfirmationSchema = z.object({
  confirmation: z.literal("CONFIRMAR", {
    error: "Digite CONFIRMAR para prosseguir.",
  }),
  reason: z.string().trim().min(10, "Informe um motivo com pelo menos 10 caracteres."),
});

export const InitialStockItemSchema = z.object({
  materialId: z.string().min(1, "O material é obrigatório"),
  quantity: z.coerce.number().int().positive("A quantidade inicial deve ser positiva"),
  unit: z.string().trim().min(1, "A unidade é obrigatória"),
  notes: z.string().trim().optional(),
});

export const InitialStockSchema = z.object({
  confirmation: z.literal("CONFIRMAR", {
    error: "Digite CONFIRMAR para prosseguir.",
  }),
  reason: z.string().trim().min(10, "Informe um motivo com pelo menos 10 caracteres."),
  items: z.array(InitialStockItemSchema).min(1, "Informe pelo menos um material."),
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
