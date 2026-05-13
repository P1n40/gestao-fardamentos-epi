"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth-server";
import prisma from "@/lib/prisma";

import {
  autoDetectKitTemplateMappings,
  buildKitTemplateReferenceMaps,
  processKitTemplatePipelineRow,
} from "./kit-templates-pipeline";
import type { ImportDetail, ImportSummary } from "./schemas";

async function loadReferenceMaps() {
  const materials = await prisma.material.findMany({
    select: {
      id: true,
      name: true,
      size: true,
      sku: true,
      active: true,
    },
  });

  return buildKitTemplateReferenceMaps({ materials });
}

export async function getKitTemplateMappingSuggestionsAction(headers: string[]) {
  await requirePermission("MANAGE_POSITIONS", true);
  return autoDetectKitTemplateMappings(headers);
}

export async function importKitTemplatesAction(
  rows: Record<string, unknown>[],
  mappings: Record<string, string>,
): Promise<ImportSummary> {
  const session = await requirePermission("MANAGE_POSITIONS", true);
  const referenceMaps = await loadReferenceMaps();
  const details: ImportDetail[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 1;
    const result = processKitTemplatePipelineRow(rows[index], mappings, referenceMaps);

    if (!result.success) {
      details.push({
        row: rowNumber,
        success: false,
        classification: "ERROR",
        errors: result.errors,
      });
      continue;
    }

    try {
      const template = await prisma.kitTemplate.upsert({
        where: { name: result.data.templateName },
        update: {
          description: result.data.description,
          active: true,
        },
        create: {
          name: result.data.templateName,
          description: result.data.description,
          active: true,
        },
      });

      const existingItem = await prisma.kitTemplateItem.findUnique({
        where: {
          templateId_materialId: {
            templateId: template.id,
            materialId: result.material.id,
          },
        },
      });

      await prisma.kitTemplateItem.upsert({
        where: {
          templateId_materialId: {
            templateId: template.id,
            materialId: result.material.id,
          },
        },
        update: {
          quantity: result.data.quantity,
          periodDays: result.data.periodDays,
          mandatory: result.data.mandatory,
        },
        create: {
          templateId: template.id,
          materialId: result.material.id,
          quantity: result.data.quantity,
          periodDays: result.data.periodDays,
          mandatory: result.data.mandatory,
        },
      });

      details.push({
        row: rowNumber,
        success: true,
        classification: existingItem ? "UPDATE" : "CREATE",
        employeeName: `${template.name} - ${result.material.name}`,
        diff: existingItem
          ? [`Item atualizado: ${result.material.name}`]
          : [`Item criado: ${result.material.name}`],
      });
    } catch (error) {
      details.push({
        row: rowNumber,
        success: false,
        classification: "ERROR",
        employeeName: result.data.templateName,
        errors: [error instanceof Error ? error.message : "Erro inesperado ao importar modelo"],
      });
    }
  }

  const summary = {
    total: rows.length,
    successCount: details.filter((detail) => detail.success).length,
    errorCount: details.filter((detail) => !detail.success).length,
    details,
  };

  await logAudit({
    userId: session.user.id,
    action: "IMPORT",
    entity: "KitTemplateBatch",
    entityId: `KIT_TEMPLATE_BATCH_${Date.now()}`,
    details: `Importacao de modelos de kit com ${rows.length} linhas (Sucesso: ${summary.successCount}, Erro: ${summary.errorCount})`,
    newValue: {
      user: session.user.name || session.user.email,
      counts: {
        total: summary.total,
        success: summary.successCount,
        error: summary.errorCount,
      },
      items: summary.details.slice(0, 100),
    },
  });

  revalidatePath("/materiais/kits");
  revalidatePath("/materiais/kits/modelos");
  revalidatePath("/materiais/kits/importacao");
  revalidatePath("/materiais/kits/importacao/historico");

  return summary;
}
