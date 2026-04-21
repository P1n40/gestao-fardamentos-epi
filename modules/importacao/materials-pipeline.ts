import { Category } from "@prisma/client";

import { normalizeString, toTitleCase } from "@/lib/utils/reconciliation";

import { MaterialImportSchema } from "./schemas";

export const MATERIAL_TARGET_FIELDS = [
  { key: "name", label: "Nome", aliases: ["nome", "material", "item", "descricao curta"] },
  { key: "category", label: "Categoria", aliases: ["categoria", "tipo", "grupo"] },
  { key: "unit", label: "Unidade", aliases: ["unidade", "und", "un", "medida"] },
  { key: "size", label: "Tamanho / Numeração", aliases: ["tamanho", "numeracao", "numeração", "grade", "tam"] },
  { key: "sku", label: "SKU", aliases: ["sku", "codigo", "código", "codigo interno"] },
  { key: "caNumber", label: "CA", aliases: ["ca", "numero ca", "número ca", "certificado"] },
  { key: "minStock", label: "Estoque Mínimo", aliases: ["estoque minimo", "estoque mínimo", "minimo", "mínimo"] },
  { key: "stock", label: "Estoque Inicial", aliases: ["estoque", "saldo inicial", "estoque inicial", "saldo"] },
  { key: "description", label: "Descrição", aliases: ["descricao", "descrição", "observacao", "observação"] },
  { key: "active", label: "Ativo", aliases: ["ativo", "status", "habilitado"] },
] as const;

export type MaterialTargetFieldKey = (typeof MATERIAL_TARGET_FIELDS)[number]["key"];

function normalizeCategory(value: unknown) {
  const normalized = normalizeString(String(value ?? ""));

  if (["uniform", "uniforme", "fardamento"].includes(normalized)) {
    return Category.UNIFORM;
  }

  if (["epi", "ppe", "equipamento de protecao individual"].includes(normalized)) {
    return Category.PPE;
  }

  return String(value ?? "").trim().toUpperCase();
}

function normalizeBoolean(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return true;
  }

  const normalized = normalizeString(String(value));
  return ["1", "true", "sim", "ativo", "yes"].includes(normalized);
}

export function autoDetectMaterialMappings(headers: string[]) {
  const mappings: Record<string, string> = {};

  headers.forEach((header) => {
    const normalizedHeader = normalizeString(header);

    for (const field of MATERIAL_TARGET_FIELDS) {
      if (mappings[field.key]) continue;

      const isMatch = field.aliases.some((alias) => {
        const normalizedAlias = normalizeString(alias);
        return normalizedHeader.includes(normalizedAlias) || normalizedAlias.includes(normalizedHeader);
      });

      if (isMatch) {
        mappings[field.key] = header;
        break;
      }
    }
  });

  return mappings;
}

export function normalizeMappedMaterialRow(mappedRow: Record<string, unknown>) {
  const normalizedRow = { ...mappedRow };

  if (normalizedRow.name) {
    normalizedRow.name = toTitleCase(String(normalizedRow.name).trim());
  }

  if (normalizedRow.category !== undefined) {
    normalizedRow.category = normalizeCategory(normalizedRow.category);
  }

  if (normalizedRow.unit) {
    normalizedRow.unit = String(normalizedRow.unit).trim().toUpperCase();
  }

  if (normalizedRow.size) {
    normalizedRow.size = String(normalizedRow.size).trim().toUpperCase();
  }

  if (normalizedRow.sku) {
    normalizedRow.sku = String(normalizedRow.sku).trim().toUpperCase();
  }

  if (normalizedRow.caNumber) {
    normalizedRow.caNumber = String(normalizedRow.caNumber).trim().toUpperCase();
  }

  if (normalizedRow.description) {
    normalizedRow.description = String(normalizedRow.description).trim();
  }

  if (normalizedRow.active !== undefined) {
    normalizedRow.active = normalizeBoolean(normalizedRow.active);
  }

  return normalizedRow;
}

function buildMaterialLookupKey(input: {
  name: string;
  category: string;
  size?: string | null;
}) {
  return [
    normalizeString(input.name),
    normalizeString(input.category),
    normalizeString(input.size ?? "sem-tamanho"),
  ].join("::");
}

export function buildMaterialReferenceMaps(
  materials: Array<{
    id: string;
    name: string;
    category: Category;
    size: string | null;
    sku: string | null;
    unit: string;
    minStock: number;
    description: string | null;
    caNumber: string | null;
    active: boolean;
    stock: number;
  }>,
) {
  const bySku = new Map<string, (typeof materials)[number]>();
  const byComposite = new Map<string, (typeof materials)[number]>();

  for (const material of materials) {
    if (material.sku) {
      bySku.set(normalizeString(material.sku), material);
    }

    byComposite.set(
      buildMaterialLookupKey({
        name: material.name,
        category: material.category,
        size: material.size,
      }),
      material,
    );
  }

  return {
    bySku,
    byComposite,
  };
}

export function processMaterialPipelineRow(
  rawRow: Record<string, unknown>,
  mappings: Record<string, string>,
  referenceMaps: ReturnType<typeof buildMaterialReferenceMaps>,
) {
  const mappedRow: Record<string, unknown> = {};

  Object.entries(mappings).forEach(([targetKey, sourceHeader]) => {
    if (sourceHeader && sourceHeader !== "SKIP") {
      mappedRow[targetKey] = rawRow[sourceHeader];
    }
  });

  const normalizedRow = normalizeMappedMaterialRow(mappedRow);
  const validation = MaterialImportSchema.safeParse(normalizedRow);

  if (!validation.success) {
    return {
      success: false as const,
      errors: validation.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  }

  const data = validation.data;
  const existingBySku = data.sku ? referenceMaps.bySku.get(normalizeString(data.sku)) : null;
  const existingByComposite = referenceMaps.byComposite.get(
    buildMaterialLookupKey({
      name: data.name,
      category: data.category,
      size: data.size,
    }),
  );

  const existingRecord = existingBySku ?? existingByComposite ?? null;
  const classification = existingRecord ? "UPDATE" : "CREATE";

  return {
    success: true as const,
    data,
    reconciliation: {
      classification,
      existingRecord,
    },
  };
}
