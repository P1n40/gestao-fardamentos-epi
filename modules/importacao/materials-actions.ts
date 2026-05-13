"use server";

import { revalidatePath } from "next/cache";
import { Category } from "@prisma/client";

import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth-server";
import prisma from "@/lib/prisma";

import {
  autoDetectMaterialMappings,
  buildMaterialReferenceMaps,
  processMaterialPipelineRow,
} from "./materials-pipeline";
import type { ImportClassification, ImportDetail, ImportSummary } from "./schemas";

type MaterialImportData = {
  name: string;
  category: Category;
  unit: string;
  size?: string | null;
  sku?: string | null;
  caNumber?: string | null;
  minStock: number;
  stock: number;
  description?: string | null;
  active: boolean;
};

async function loadMaterialReferenceMaps() {
  const materials = await prisma.material.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      size: true,
      sku: true,
      unit: true,
      minStock: true,
      description: true,
      caNumber: true,
      active: true,
      stock: true,
    },
  });

  return buildMaterialReferenceMaps(materials);
}

function buildMaterialDiff(params: {
  existingRecord: {
    name: string;
    category: Category;
    unit: string;
    size: string | null;
    sku: string | null;
    caNumber: string | null;
    minStock: number;
    description: string | null;
    active: boolean;
    stock: number;
  };
  data: MaterialImportData;
}) {
  const diff: string[] = [];
  const { existingRecord, data } = params;

  if (existingRecord.name !== data.name) diff.push(`Nome: ${existingRecord.name} -> ${data.name}`);
  if (existingRecord.category !== data.category)
    diff.push(`Categoria: ${existingRecord.category} -> ${data.category}`);
  if (existingRecord.unit !== data.unit)
    diff.push(`Unidade: ${existingRecord.unit} -> ${data.unit}`);
  if ((existingRecord.size ?? "") !== (data.size ?? ""))
    diff.push(`Tamanho: ${existingRecord.size ?? "-"} -> ${data.size ?? "-"}`);
  if ((existingRecord.sku ?? "") !== (data.sku ?? ""))
    diff.push(`SKU: ${existingRecord.sku ?? "-"} -> ${data.sku ?? "-"}`);
  if ((existingRecord.caNumber ?? "") !== (data.caNumber ?? ""))
    diff.push(`CA: ${existingRecord.caNumber ?? "-"} -> ${data.caNumber ?? "-"}`);
  if (existingRecord.minStock !== data.minStock)
    diff.push(`Estoque minimo: ${existingRecord.minStock} -> ${data.minStock}`);
  if ((existingRecord.description ?? "") !== (data.description ?? ""))
    diff.push(`Descricao atualizada`);
  if (existingRecord.active !== data.active)
    diff.push(
      `Status: ${existingRecord.active ? "Ativo" : "Inativo"} -> ${data.active ? "Ativo" : "Inativo"}`,
    );
  if (existingRecord.stock !== data.stock)
    diff.push(`Saldo alvo: ${existingRecord.stock} -> ${data.stock}`);

  return diff;
}

async function applyMaterialImportRow(params: {
  data: MaterialImportData;
  existingRecord: {
    id: string;
    stock: number;
  } | null;
  userId: string;
}) {
  const { data, existingRecord, userId } = params;

  return await prisma.$transaction(async (tx) => {
    const material = existingRecord
      ? await tx.material.update({
          where: { id: existingRecord.id },
          data: {
            name: data.name,
            category: data.category,
            unit: data.unit,
            size: data.size ?? null,
            sku: data.sku ?? null,
            caNumber: data.caNumber ?? null,
            minStock: data.minStock,
            description: data.description ?? null,
            active: data.active,
          },
        })
      : await tx.material.create({
          data: {
            name: data.name,
            category: data.category,
            unit: data.unit,
            size: data.size ?? null,
            sku: data.sku ?? null,
            caNumber: data.caNumber ?? null,
            minStock: data.minStock,
            description: data.description ?? null,
            active: data.active,
            stock: 0,
          },
        });

    const previousStock = existingRecord?.stock ?? 0;
    const stockDelta = data.stock - previousStock;

    if (stockDelta !== 0) {
      await tx.stockTransaction.create({
        data: {
          materialId: material.id,
          type: "ADJUSTMENT",
          quantity: stockDelta,
          balanceBefore: previousStock,
          balanceAfter: data.stock,
          reason: existingRecord
            ? "Ajuste por importacao em massa"
            : "Saldo inicial por importacao em massa",
          userId,
        },
      });

      await tx.material.update({
        where: { id: material.id },
        data: { stock: data.stock },
      });
    }

    return material;
  });
}

export async function getMaterialMappingSuggestionsAction(headers: string[]) {
  await requirePermission("MANAGE_MATERIALS", true);
  return autoDetectMaterialMappings(headers);
}

export async function validateMaterialImportAction(
  rows: Record<string, unknown>[],
  mappings: Record<string, string>,
): Promise<ImportSummary> {
  await requirePermission("MANAGE_MATERIALS", true);

  const details: ImportDetail[] = [];
  let successCount = 0;
  let errorCount = 0;

  const referenceMaps = await loadMaterialReferenceMaps();

  for (let i = 0; i < rows.length; i += 1) {
    const result = processMaterialPipelineRow(rows[i], mappings, referenceMaps);
    const rowNumber = i + 1;

    if (!result.success) {
      details.push({
        row: rowNumber,
        success: false,
        classification: "ERROR",
        errors: result.errors,
      });
      errorCount += 1;
      continue;
    }

    const diff = result.reconciliation.existingRecord
      ? buildMaterialDiff({
          existingRecord: result.reconciliation.existingRecord,
          data: result.data,
        })
      : undefined;

    const classification: ImportClassification =
      diff && diff.length === 0
        ? "UNCHANGED"
        : (result.reconciliation.classification as ImportClassification);

    details.push({
      row: rowNumber,
      success: true,
      classification,
      employeeName: result.data.name,
      diff: diff && diff.length > 0 ? diff : undefined,
    });

    successCount += 1;
  }

  return {
    total: rows.length,
    successCount,
    errorCount,
    details,
  };
}

export async function importMaterialsAction(
  rows: Record<string, unknown>[],
  mappings: Record<string, string>,
): Promise<ImportSummary> {
  const session = await requirePermission("MANAGE_MATERIALS", true);
  const user = session.user;

  const details: ImportDetail[] = [];
  let successCount = 0;
  let errorCount = 0;

  let referenceMaps = await loadMaterialReferenceMaps();

  for (let i = 0; i < rows.length; i += 1) {
    const rowNumber = i + 1;

    try {
      const result = processMaterialPipelineRow(rows[i], mappings, referenceMaps);

      if (!result.success) {
        details.push({
          row: rowNumber,
          success: false,
          classification: "ERROR",
          errors: result.errors,
        });
        errorCount += 1;
        continue;
      }

      const diff = result.reconciliation.existingRecord
        ? buildMaterialDiff({
            existingRecord: result.reconciliation.existingRecord,
            data: result.data,
          })
        : [];

      const classification: ImportClassification =
        diff.length === 0 && result.reconciliation.existingRecord
          ? "UNCHANGED"
          : (result.reconciliation.classification as ImportClassification);

      if (classification !== "UNCHANGED") {
        const material = await applyMaterialImportRow({
          data: result.data,
          existingRecord: result.reconciliation.existingRecord,
          userId: user.id,
        });
        referenceMaps = await loadMaterialReferenceMaps();

        await logAudit({
          userId: user.id,
          action: classification === "CREATE" ? "CREATE" : "UPDATE",
          entity: "Material",
          entityId: material.id,
          details:
            classification === "CREATE"
              ? `Material criado via importacao em massa: ${result.data.name}`
              : `Material atualizado via importacao em massa: ${result.data.name}`,
          newValue: {
            sku: result.data.sku,
            category: result.data.category,
            stock: result.data.stock,
            minStock: result.data.minStock,
          },
        });
      }

      details.push({
        row: rowNumber,
        success: true,
        classification,
        employeeName: result.data.name,
        diff: diff.length > 0 ? diff : undefined,
      });

      successCount += 1;
    } catch (error: unknown) {
      details.push({
        row: rowNumber,
        success: false,
        classification: "ERROR",
        errors: [error instanceof Error ? error.message : "Erro inesperado na importacao"],
      });
      errorCount += 1;
    }
  }

  await logAudit({
    userId: user.id,
    action: "IMPORT",
    entity: "MaterialBatch",
    entityId: `BATCH_${Date.now()}`,
    details: `Importacao de materiais com ${rows.length} registros (Sucesso: ${successCount}, Erro: ${errorCount})`,
    newValue: {
      filename: "Importacao em massa de materiais",
      user: user.name || user.email,
      counts: {
        total: rows.length,
        success: successCount,
        error: errorCount,
        create: details.filter((detail) => detail.classification === "CREATE").length,
        update: details.filter((detail) => detail.classification === "UPDATE").length,
        unchanged: details.filter((detail) => detail.classification === "UNCHANGED").length,
      },
      items: details.slice(0, 100).map((detail) => ({
        r: detail.row,
        s: detail.success,
        c: detail.classification,
        n: detail.employeeName,
        diff: detail.diff,
        err: detail.errors,
      })),
    },
  });

  revalidatePath("/materiais/catalogo");
  revalidatePath("/estoque");
  revalidatePath("/dashboard");

  return {
    total: rows.length,
    successCount,
    errorCount,
    details,
  };
}
