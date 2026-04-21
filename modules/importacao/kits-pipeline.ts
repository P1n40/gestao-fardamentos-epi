import { Category } from "@prisma/client";

import { normalizeString, toTitleCase } from "@/lib/utils/reconciliation";

import { KitImportSchema } from "./schemas";

export const KIT_TARGET_FIELDS = [
  { key: "positionName", label: "Cargo", aliases: ["cargo", "posicao", "posição", "funcao", "função"] },
  { key: "validFrom", label: "Inicio da Vigencia", aliases: ["vigencia", "vigência", "inicio vigencia", "inicio da vigencia", "validade inicio", "data inicio", "inicio"] },
  { key: "notes", label: "Observacoes da Revisao", aliases: ["observacoes", "observações", "notas", "descricao revisao", "descricao da revisao"] },
  { key: "materialSku", label: "SKU do Material", aliases: ["sku", "codigo material", "código material", "codigo", "código"] },
  { key: "materialName", label: "Nome do Material", aliases: ["material", "nome material", "nome do material", "item"] },
  { key: "materialSize", label: "Tamanho / Numeracao", aliases: ["tamanho", "numeração", "numeracao", "grade", "tam"] },
  { key: "quantity", label: "Quantidade", aliases: ["quantidade", "qtd", "qtde"] },
  { key: "periodDays", label: "Periodicidade Dias", aliases: ["periodicidade", "periodicidade dias", "reposicao dias", "reposição dias", "periodo dias", "ciclo dias"] },
  { key: "mandatory", label: "Obrigatorio", aliases: ["obrigatorio", "obrigatório", "mandatorio", "mandatório"] },
] as const;

export type KitTargetFieldKey = (typeof KIT_TARGET_FIELDS)[number]["key"];

type PositionReference = {
  id: string;
  name: string;
  requiresUniform: boolean;
  requiresPPE: boolean;
  active: boolean;
};

type MaterialReference = {
  id: string;
  name: string;
  category: Category;
  size: string | null;
  sku: string | null;
  active: boolean;
};

type DraftRevisionReference = {
  id: string;
  positionId: string;
  version: number;
  notes: string | null;
  validFrom: Date;
  isActive: boolean;
  validTo: Date | null;
  items: Array<{
    materialId: string;
    quantity: number;
    periodDays: number | null;
    mandatory: boolean;
  }>;
};

function normalizeBoolean(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return true;
  }

  const normalized = normalizeString(String(value));
  return ["1", "true", "sim", "ativo", "yes", "obrigatorio", "obrigatório"].includes(normalized);
}

function parseSpreadsheetDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const base = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(base.getTime() + value * 24 * 60 * 60 * 1000);
    if (!Number.isNaN(date.getTime())) {
      date.setHours(0, 0, 0, 0);
      return date;
    }
  }

  const raw = String(value ?? "").trim();
  if (!raw) return null;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split("/").map(Number);
    const date = new Date(year, month - 1, day);
    if (!Number.isNaN(date.getTime())) {
      date.setHours(0, 0, 0, 0);
      return date;
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      date.setHours(0, 0, 0, 0);
      return date;
    }
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

export function buildKitImportGroupKey(positionId: string, validFrom: Date) {
  return `${positionId}::${validFrom.toISOString().slice(0, 10)}`;
}

function buildMaterialCompositeKey(name: string, size?: string | null) {
  return [normalizeString(name), normalizeString(size ?? "sem-tamanho")].join("::");
}

export function autoDetectKitMappings(headers: string[]) {
  const mappings: Record<string, string> = {};

  headers.forEach((header) => {
    const normalizedHeader = normalizeString(header);

    for (const field of KIT_TARGET_FIELDS) {
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

export function normalizeMappedKitRow(mappedRow: Record<string, unknown>) {
  const normalizedRow = { ...mappedRow };

  if (normalizedRow.positionName) {
    normalizedRow.positionName = toTitleCase(String(normalizedRow.positionName).trim());
  }

  if (normalizedRow.materialName) {
    normalizedRow.materialName = toTitleCase(String(normalizedRow.materialName).trim());
  }

  if (normalizedRow.materialSku) {
    normalizedRow.materialSku = String(normalizedRow.materialSku).trim().toUpperCase();
  }

  if (normalizedRow.materialSize) {
    normalizedRow.materialSize = String(normalizedRow.materialSize).trim().toUpperCase();
  }

  if (normalizedRow.notes) {
    normalizedRow.notes = String(normalizedRow.notes).trim();
  }

  if (normalizedRow.validFrom !== undefined) {
    normalizedRow.validFrom = parseSpreadsheetDate(normalizedRow.validFrom);
  }

  if (normalizedRow.mandatory !== undefined) {
    normalizedRow.mandatory = normalizeBoolean(normalizedRow.mandatory);
  }

  return normalizedRow;
}

export function buildKitReferenceMaps(params: {
  positions: PositionReference[];
  materials: MaterialReference[];
  draftRevisions: DraftRevisionReference[];
}) {
  const positionsByName = new Map<string, PositionReference>();
  const materialsBySku = new Map<string, MaterialReference>();
  const materialsByComposite = new Map<string, MaterialReference>();
  const materialsByName = new Map<string, MaterialReference[]>();
  const draftRevisionsByGroup = new Map<string, DraftRevisionReference[]>();

  for (const position of params.positions) {
    positionsByName.set(normalizeString(position.name), position);
  }

  for (const material of params.materials) {
    if (material.sku) {
      materialsBySku.set(normalizeString(material.sku), material);
    }

    materialsByComposite.set(buildMaterialCompositeKey(material.name, material.size), material);

    const nameKey = normalizeString(material.name);
    const list = materialsByName.get(nameKey) ?? [];
    list.push(material);
    materialsByName.set(nameKey, list);
  }

  for (const revision of params.draftRevisions) {
    const groupKey = buildKitImportGroupKey(revision.positionId, revision.validFrom);
    const list = draftRevisionsByGroup.get(groupKey) ?? [];
    list.push(revision);
    draftRevisionsByGroup.set(groupKey, list);
  }

  return {
    positionsByName,
    materialsBySku,
    materialsByComposite,
    materialsByName,
    draftRevisionsByGroup,
  };
}

function resolveMaterial(params: {
  materialSku?: string | null;
  materialName?: string | null;
  materialSize?: string | null;
  referenceMaps: ReturnType<typeof buildKitReferenceMaps>;
}) {
  const { materialSku, materialName, materialSize, referenceMaps } = params;

  if (materialSku) {
    const bySku = referenceMaps.materialsBySku.get(normalizeString(materialSku));
    if (!bySku) {
      return { error: `Material com SKU "${materialSku}" nao encontrado` };
    }

    return { material: bySku };
  }

  if (!materialName) {
    return { error: "Informe o SKU do material ou o nome do material" };
  }

  if (materialSize) {
    const byComposite = referenceMaps.materialsByComposite.get(
      buildMaterialCompositeKey(materialName, materialSize),
    );

    if (!byComposite) {
      return { error: `Material "${materialName}" tamanho "${materialSize}" nao encontrado` };
    }

    return { material: byComposite };
  }

  const matches = referenceMaps.materialsByName.get(normalizeString(materialName)) ?? [];
  if (matches.length === 0) {
    return { error: `Material "${materialName}" nao encontrado` };
  }

  if (matches.length > 1) {
    return {
      error: `Material "${materialName}" possui mais de uma variante. Informe o tamanho ou SKU`,
      classification: "AMBIGUOUS" as const,
    };
  }

  return { material: matches[0] };
}

export function processKitPipelineRow(
  rawRow: Record<string, unknown>,
  mappings: Record<string, string>,
  referenceMaps: ReturnType<typeof buildKitReferenceMaps>,
) {
  const mappedRow: Record<string, unknown> = {};

  Object.entries(mappings).forEach(([targetKey, sourceHeader]) => {
    if (sourceHeader && sourceHeader !== "SKIP") {
      mappedRow[targetKey] = rawRow[sourceHeader];
    }
  });

  const normalizedRow = normalizeMappedKitRow(mappedRow);
  const validation = KitImportSchema.safeParse(normalizedRow);

  if (!validation.success) {
    return {
      success: false as const,
      classification: "ERROR" as const,
      errors: validation.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  }

  const data = validation.data;
  const position = referenceMaps.positionsByName.get(normalizeString(data.positionName));

  if (!position) {
    return {
      success: false as const,
      classification: "ERROR" as const,
      errors: [`Cargo "${data.positionName}" nao encontrado`],
    };
  }

  if (!position.active) {
    return {
      success: false as const,
      classification: "ERROR" as const,
      errors: [`Cargo "${data.positionName}" esta inativo`],
    };
  }

  const materialResult = resolveMaterial({
    materialSku: data.materialSku,
    materialName: data.materialName,
    materialSize: data.materialSize,
    referenceMaps,
  });

  if (!materialResult.material) {
    return {
      success: false as const,
      classification: materialResult.classification ?? ("ERROR" as const),
      errors: [materialResult.error ?? "Material nao encontrado"],
    };
  }

  const material = materialResult.material;

  if (!material.active) {
    return {
      success: false as const,
      classification: "ERROR" as const,
      errors: [`Material "${material.name}" esta inativo`],
    };
  }

  if (material.category === "UNIFORM" && !position.requiresUniform) {
    return {
      success: false as const,
      classification: "ERROR" as const,
      errors: [`Cargo "${position.name}" nao aceita itens de fardamento`],
    };
  }

  if (material.category === "PPE" && !position.requiresPPE) {
    return {
      success: false as const,
      classification: "ERROR" as const,
      errors: [`Cargo "${position.name}" nao aceita itens de EPI`],
    };
  }

  const groupKey = buildKitImportGroupKey(position.id, data.validFrom);
  const existingDrafts = referenceMaps.draftRevisionsByGroup.get(groupKey) ?? [];

  if (existingDrafts.length > 1) {
    return {
      success: false as const,
      classification: "AMBIGUOUS" as const,
      errors: [
        `Existe mais de um rascunho para o cargo "${position.name}" em ${data.validFrom.toLocaleDateString("pt-BR")}`,
      ],
    };
  }

  return {
    success: true as const,
    data,
    resolution: {
      groupKey,
      position,
      material,
      existingDraft: existingDrafts[0] ?? null,
      classification: existingDrafts[0] ? ("UPDATE" as const) : ("CREATE" as const),
    },
  };
}
