import { z } from "zod";

export const EmployeeImportSchema = z.object({
  name: z.string().min(3, "Nome muito curto"),
  documentId: z.string().regex(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF inválido"),
  registrationCode: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  positionName: z.string().min(2, "Cargo é obrigatório"),
  shirtSize: z.string().optional().nullable(),
  pantsSize: z.string().optional().nullable(),
  shoeSize: z.string().optional().nullable(),
});

export type EmployeeImportRow = z.infer<typeof EmployeeImportSchema>;

export const MaterialImportSchema = z.object({
  name: z.string().min(2, "Nome do material muito curto"),
  category: z.enum(["UNIFORM", "PPE"], "Categoria invalida"),
  unit: z.string().trim().min(1, "Unidade e obrigatoria").default("UN"),
  size: z.string().trim().optional().nullable(),
  sku: z.string().trim().optional().nullable(),
  caNumber: z.string().trim().optional().nullable(),
  minStock: z.coerce.number().int().nonnegative("Estoque minimo deve ser positivo ou zero"),
  stock: z.coerce.number().int().nonnegative("Estoque inicial deve ser positivo ou zero").default(0),
  description: z.string().trim().optional().nullable(),
  active: z.boolean().optional().default(true),
});

export type MaterialImportRow = z.infer<typeof MaterialImportSchema>;

export const KitImportSchema = z
  .object({
    positionName: z.string().trim().min(2, "Cargo e obrigatorio"),
    validFrom: z.date(),
    notes: z.string().trim().optional().nullable(),
    materialSku: z.string().trim().optional().nullable(),
    materialName: z.string().trim().optional().nullable(),
    materialSize: z.string().trim().optional().nullable(),
    quantity: z.coerce.number().int().positive("Quantidade deve ser positiva"),
    periodDays: z.coerce.number().int().nonnegative("Periodicidade deve ser positiva ou zero").optional().nullable(),
    mandatory: z.boolean().optional().default(true),
  })
  .refine((row) => Boolean(row.materialSku || row.materialName), {
    message: "Informe o SKU do material ou o nome do material",
    path: ["materialName"],
  });

export type KitImportRow = z.infer<typeof KitImportSchema>;

export type ImportClassification = "CREATE" | "UPDATE" | "AMBIGUOUS" | "ERROR" | "UNCHANGED";

export interface ImportDetail {
  row: number;
  success: boolean;
  errors?: string[];
  employeeName?: string;
  classification?: ImportClassification;
  diff?: string[];
}

export interface ImportSummary {
  total: number;
  successCount: number;
  errorCount: number;
  details: ImportDetail[];
}
