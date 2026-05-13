import { normalizeString, toTitleCase } from "@/lib/utils/reconciliation";

export const KIT_TEMPLATE_TARGET_FIELDS = [
  {
    key: "templateName",
    label: "Modelo de Kit",
    aliases: ["modelo", "modelo de kit", "kit", "nome do kit", "kit padrao", "kit padrão"],
  },
  {
    key: "description",
    label: "Descrição",
    aliases: ["descricao", "descrição", "observacoes", "observações", "notas"],
  },
  {
    key: "materialSku",
    label: "SKU do Material",
    aliases: ["sku", "codigo", "código", "sku material", "codigo material"],
  },
  {
    key: "materialName",
    label: "Nome do Material",
    aliases: ["material", "nome material", "nome do material", "item"],
  },
  {
    key: "materialSize",
    label: "Tamanho",
    aliases: ["tamanho", "tam", "size", "numero", "numeração", "numeracao"],
  },
  {
    key: "quantity",
    label: "Quantidade",
    aliases: ["quantidade", "qtd", "qtde"],
  },
  {
    key: "periodDays",
    label: "Periodicidade Dias",
    aliases: ["periodicidade", "periodicidade dias", "reposicao", "reposição", "dias"],
  },
  {
    key: "mandatory",
    label: "Obrigatório",
    aliases: ["obrigatorio", "obrigatório", "mandatorio", "mandatório"],
  },
] as const;

export type KitTemplateTargetFieldKey = (typeof KIT_TEMPLATE_TARGET_FIELDS)[number]["key"];

export interface KitTemplateImportRow {
  templateName: string;
  description?: string | null;
  materialSku?: string | null;
  materialName?: string | null;
  materialSize?: string | null;
  quantity: number;
  periodDays?: number | null;
  mandatory: boolean;
}

export interface KitTemplateReferenceMaps {
  materialsBySku: Map<string, KitTemplateMaterialReference>;
  materialsByNameAndSize: Map<string, KitTemplateMaterialReference[]>;
}

export interface KitTemplateMaterialReference {
  id: string;
  name: string;
  size: string | null;
  sku: string | null;
  active: boolean;
}

export function autoDetectKitTemplateMappings(headers: string[]): Record<string, string> {
  const mappings: Record<string, string> = {};

  headers.forEach((header) => {
    const normalizedHeader = normalizeString(header);

    for (const field of KIT_TEMPLATE_TARGET_FIELDS) {
      if (mappings[field.key]) continue;

      const isMatch = field.aliases.some((alias) => {
        const normalizedAlias = normalizeString(alias);
        return (
          normalizedHeader.includes(normalizedAlias) || normalizedAlias.includes(normalizedHeader)
        );
      });

      if (isMatch) {
        mappings[field.key] = header;
        break;
      }
    }
  });

  return mappings;
}

export function parseBooleanLike(value: unknown, defaultValue = true) {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }

  const normalized = normalizeString(String(value));
  if (["sim", "s", "true", "1", "yes"].includes(normalized)) {
    return true;
  }
  if (["nao", "n", "false", "0", "no"].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

export function normalizeMappedKitTemplateRow(mappedRow: Record<string, unknown>) {
  const normalizedRow = { ...mappedRow };

  if (normalizedRow.templateName) {
    normalizedRow.templateName = toTitleCase(String(normalizedRow.templateName).trim());
  }
  if (normalizedRow.description) {
    normalizedRow.description = String(normalizedRow.description).trim();
  }
  if (normalizedRow.materialSku) {
    normalizedRow.materialSku = String(normalizedRow.materialSku).trim().toUpperCase();
  }
  if (normalizedRow.materialName) {
    normalizedRow.materialName = toTitleCase(String(normalizedRow.materialName).trim());
  }
  if (normalizedRow.materialSize) {
    normalizedRow.materialSize = String(normalizedRow.materialSize).trim().toUpperCase();
  }
  if (normalizedRow.quantity) {
    normalizedRow.quantity = Number(normalizedRow.quantity);
  }
  if (normalizedRow.periodDays) {
    normalizedRow.periodDays = Number(normalizedRow.periodDays);
  }
  normalizedRow.mandatory = parseBooleanLike(normalizedRow.mandatory, true);

  return normalizedRow;
}

function buildMaterialNameSizeKey(name: string, size?: string | null) {
  return `${normalizeString(name)}::${normalizeString(size ?? "")}`;
}

export function buildKitTemplateReferenceMaps(params: {
  materials: KitTemplateMaterialReference[];
}): KitTemplateReferenceMaps {
  const materialsBySku = new Map<string, KitTemplateMaterialReference>();
  const materialsByNameAndSize = new Map<string, KitTemplateMaterialReference[]>();

  for (const material of params.materials) {
    if (material.sku) {
      materialsBySku.set(normalizeString(material.sku), material);
    }

    const key = buildMaterialNameSizeKey(material.name, material.size);
    const list = materialsByNameAndSize.get(key) ?? [];
    list.push(material);
    materialsByNameAndSize.set(key, list);
  }

  return {
    materialsBySku,
    materialsByNameAndSize,
  };
}

export function resolveKitTemplateMaterial(params: {
  row: KitTemplateImportRow;
  referenceMaps: KitTemplateReferenceMaps;
}) {
  if (params.row.materialSku) {
    const material = params.referenceMaps.materialsBySku.get(
      normalizeString(params.row.materialSku),
    );
    if (material) return { material };
  }

  if (!params.row.materialName) {
    return { errors: ["Informe SKU ou nome do material."] };
  }

  const exactKey = buildMaterialNameSizeKey(params.row.materialName, params.row.materialSize);
  const exactMatches = params.referenceMaps.materialsByNameAndSize.get(exactKey) ?? [];
  if (exactMatches.length === 1) {
    return { material: exactMatches[0] };
  }

  if (exactMatches.length > 1) {
    return {
      errors: [`Mais de uma variante encontrada para ${params.row.materialName}. Informe SKU.`],
    };
  }

  return { errors: [`Material "${params.row.materialName}" nao encontrado.`] };
}

export function processKitTemplatePipelineRow(
  rawRow: Record<string, unknown>,
  mappings: Record<string, string>,
  referenceMaps: KitTemplateReferenceMaps,
) {
  const mappedRow: Record<string, unknown> = {};

  Object.entries(mappings).forEach(([targetKey, sourceHeader]) => {
    if (sourceHeader && sourceHeader !== "SKIP") {
      mappedRow[targetKey] = rawRow[sourceHeader];
    }
  });

  const normalizedRow = normalizeMappedKitTemplateRow(mappedRow);
  const errors: string[] = [];

  if (!normalizedRow.templateName) {
    errors.push("Modelo de Kit: campo obrigatorio.");
  }

  if (!normalizedRow.quantity || Number(normalizedRow.quantity) <= 0) {
    errors.push("Quantidade: informe um numero positivo.");
  }

  if (errors.length > 0) {
    return { success: false as const, errors };
  }

  const data: KitTemplateImportRow = {
    templateName: String(normalizedRow.templateName),
    description: normalizedRow.description ? String(normalizedRow.description) : null,
    materialSku: normalizedRow.materialSku ? String(normalizedRow.materialSku) : null,
    materialName: normalizedRow.materialName ? String(normalizedRow.materialName) : null,
    materialSize: normalizedRow.materialSize ? String(normalizedRow.materialSize) : null,
    quantity: Number(normalizedRow.quantity),
    periodDays: normalizedRow.periodDays ? Number(normalizedRow.periodDays) : null,
    mandatory: Boolean(normalizedRow.mandatory),
  };

  const materialResolution = resolveKitTemplateMaterial({ row: data, referenceMaps });
  if (materialResolution.errors) {
    return { success: false as const, errors: materialResolution.errors };
  }

  if (!materialResolution.material?.active) {
    return { success: false as const, errors: ["Material inativo nao pode ser importado."] };
  }

  return {
    success: true as const,
    data,
    material: materialResolution.material,
  };
}
