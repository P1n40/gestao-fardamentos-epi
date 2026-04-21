import { EmployeeImportSchema, ImportClassification } from "./schemas";
import { normalizeCPF, normalizeString, toTitleCase } from "@/lib/utils/reconciliation";
import { reconcileEmployee } from "./reconciliation";
import { PrismaClient } from "@prisma/client";

/**
 * Definition of target fields for auto-detection and pipeline processing.
 */
export const TARGET_FIELDS = [
  { key: "name", label: "Nome", aliases: ["nome", "name", "nome completo", "colaborador", "funcionario"] },
  { key: "documentId", label: "CPF", aliases: ["cpf", "documento", "id", "doc", "identidade"] },
  { key: "registrationCode", label: "Matrícula", aliases: ["matricula", "matrícula", "registro", "re", "codigo", "código"] },
  { key: "department", label: "Setor/Secretaria", aliases: ["secretaria", "departamento", "setor", "unidade", "órgão", "orgao"] },
  { key: "positionName", label: "Cargo", aliases: ["cargo", "função", "funcao", "cgo", "ocupação"] },
  { key: "shirtSize", label: "Tam. Camisa", aliases: ["camisa", "tamanho camisa", "vestuario superior", "camizeta"] },
  { key: "pantsSize", label: "Tam. Calça", aliases: ["calça", "calca", "tamanho calça", "vestuario inferior", "bermuda"] },
  { key: "shoeSize", label: "Tam. Calçado", aliases: ["sapato", "calçado", "calcado", "tamanho bota", "coturno"] },
] as const;

export type TargetFieldKey = typeof TARGET_FIELDS[number]["key"];

/**
 * Heuristically identifies mappings between spreadsheet headers and target fields.
 */
export function autoDetectMappings(headers: string[]): Record<string, string> {
  const mappings: Record<string, string> = {};

  headers.forEach((header) => {
    const normalizedHeader = normalizeString(header);
    
    for (const field of TARGET_FIELDS) {
      if (mappings[field.key]) continue; // Already mapped

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

export function normalizeMappedEmployeeRow(mappedRow: Record<string, unknown>) {
  const normalizedRow = { ...mappedRow };

  if (normalizedRow.name) normalizedRow.name = toTitleCase(String(normalizedRow.name).trim());
  if (normalizedRow.documentId)
    normalizedRow.documentId = normalizeCPF(String(normalizedRow.documentId));
  if (normalizedRow.shirtSize)
    normalizedRow.shirtSize = String(normalizedRow.shirtSize).toUpperCase().trim();
  if (normalizedRow.pantsSize)
    normalizedRow.pantsSize = String(normalizedRow.pantsSize).toUpperCase().trim();
  if (normalizedRow.shoeSize) normalizedRow.shoeSize = String(normalizedRow.shoeSize).trim();

  return normalizedRow;
}

export function resolvePositionId(positionName: string, positionMap: Map<string, string>) {
  return positionMap.get(normalizeString(positionName)) || null;
}

/**
 * Transforms a raw row from a spreadsheet into a standardized, validated, and reconciled object.
 */
export async function processPipelineRow(
  prisma: PrismaClient,
  rawRow: Record<string, unknown>,
  mappings: Record<string, string>,
  positionMap: Map<string, string>,
) {
  const mappedRow: Record<string, any> = {};

  // 1. Initial Mapping
  Object.entries(mappings).forEach(([targetKey, sourceHeader]) => {
    if (sourceHeader && sourceHeader !== "SKIP") {
      mappedRow[targetKey] = rawRow[sourceHeader];
    }
  });

  // 2. Normalization (Internal Pre-processing)
  const normalizedRow = normalizeMappedEmployeeRow(mappedRow);

  // 3. Schema Validation
  const validation = EmployeeImportSchema.safeParse(normalizedRow);
  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }

  const data = validation.data;

  // 4. Resolve Position
  const posId = resolvePositionId(data.positionName, positionMap);
  if (!posId) {
    return {
      success: false,
      errors: [`Cargo "${data.positionName}" não encontrado.`],
    };
  }

  // 5. Reconciliation (US-26/T29)
  const reconciliation = await reconcileEmployee(prisma, {
    name: data.name,
    documentId: data.documentId,
    registrationCode: data.registrationCode,
  });

  return {
    success: true,
    data: { ...data, positionId: posId },
    reconciliation,
  };
}
