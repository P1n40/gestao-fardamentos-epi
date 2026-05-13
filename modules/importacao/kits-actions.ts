"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { checkKitRevisionConflicts } from "@/modules/kits/services";

import {
  autoDetectKitMappings,
  buildKitImportGroupKey,
  buildKitReferenceMaps,
  processKitPipelineRow,
} from "./kits-pipeline";
import type { ImportClassification, ImportDetail, ImportSummary, KitImportRow } from "./schemas";

type ResolvedKitRow = {
  row: number;
  data: KitImportRow;
  groupKey: string;
  position: {
    id: string;
    name: string;
  };
  material: {
    id: string;
    name: string;
    category: "UNIFORM" | "PPE";
    size: string | null;
  };
  existingDraft: {
    id: string;
    version: number;
    notes: string | null;
    validFrom: Date;
    items: Array<{
      materialId: string;
      quantity: number;
      periodDays: number | null;
      mandatory: boolean;
    }>;
  } | null;
  classification: "CREATE" | "UPDATE";
};

type KitGroupPlan = {
  key: string;
  rowNumbers: number[];
  positionId: string;
  positionName: string;
  validFrom: Date;
  notes: string | null;
  existingDraft: ResolvedKitRow["existingDraft"];
  rows: ResolvedKitRow[];
};

function describeKitRow(row: ResolvedKitRow) {
  return `${row.position.name} - ${row.material.name}${row.material.size ? ` (${row.material.size})` : ""}`;
}

async function loadKitReferenceMaps() {
  const [positions, materials, draftRevisions] = await Promise.all([
    prisma.position.findMany({
      select: {
        id: true,
        name: true,
        requiresUniform: true,
        requiresPPE: true,
        active: true,
      },
    }),
    prisma.material.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        size: true,
        sku: true,
        active: true,
      },
    }),
    prisma.kitRevision.findMany({
      where: {
        isActive: false,
        validTo: null,
      },
      select: {
        id: true,
        positionId: true,
        version: true,
        notes: true,
        validFrom: true,
        isActive: true,
        validTo: true,
        items: {
          select: {
            materialId: true,
            quantity: true,
            periodDays: true,
            mandatory: true,
          },
        },
      },
    }),
  ]);

  return buildKitReferenceMaps({
    positions,
    materials,
    draftRevisions,
  });
}

function buildKitDiff(row: ResolvedKitRow) {
  const diff: string[] = [];

  if (!row.existingDraft) {
    diff.push(
      `Nova revisao para ${row.position.name} com vigencia em ${row.data.validFrom.toLocaleDateString("pt-BR")}`,
    );
    diff.push(
      `Item importado: ${row.material.name}${row.material.size ? ` (${row.material.size})` : ""}`,
    );
    return diff;
  }

  const existingItem = row.existingDraft.items.find((item) => item.materialId === row.material.id);

  if (!existingItem) {
    diff.push(`Novo item no rascunho v${row.existingDraft.version}`);
  } else {
    if (existingItem.quantity !== row.data.quantity) {
      diff.push(`Quantidade: ${existingItem.quantity} -> ${row.data.quantity}`);
    }

    if ((existingItem.periodDays ?? null) !== (row.data.periodDays ?? null)) {
      diff.push(
        `Periodicidade: ${existingItem.periodDays ?? "unica"} -> ${row.data.periodDays ?? "unica"}`,
      );
    }

    if (existingItem.mandatory !== row.data.mandatory) {
      diff.push(
        `Obrigatorio: ${existingItem.mandatory ? "Sim" : "Nao"} -> ${row.data.mandatory ? "Sim" : "Nao"}`,
      );
    }
  }

  if ((row.existingDraft.notes ?? "") !== (row.data.notes ?? "")) {
    diff.push("Notas da revisao atualizadas");
  }

  return diff;
}

function summarizeGroupFailure(rows: ResolvedKitRow[], message: string) {
  return rows.map((row) => ({
    row: row.row,
    success: false,
    classification: "ERROR" as const,
    employeeName: describeKitRow(row),
    errors: [message],
  }));
}

async function validateKitGroups(rows: ResolvedKitRow[]) {
  const detailsByRow = new Map<number, ImportDetail>();
  const groups = new Map<string, KitGroupPlan>();

  for (const row of rows) {
    const group = groups.get(row.groupKey) ?? {
      key: row.groupKey,
      rowNumbers: [],
      positionId: row.position.id,
      positionName: row.position.name,
      validFrom: row.data.validFrom,
      notes: row.data.notes ?? null,
      existingDraft: row.existingDraft,
      rows: [],
    };

    group.rowNumbers.push(row.row);
    group.rows.push(row);
    if (!group.notes && row.data.notes) {
      group.notes = row.data.notes;
    }

    groups.set(row.groupKey, group);
  }

  const validGroups: KitGroupPlan[] = [];

  for (const group of groups.values()) {
    const duplicateMaterialIds = new Set<string>();
    const seenMaterialIds = new Set<string>();

    for (const row of group.rows) {
      if (seenMaterialIds.has(row.material.id)) {
        duplicateMaterialIds.add(row.material.id);
      }
      seenMaterialIds.add(row.material.id);
    }

    if (duplicateMaterialIds.size > 0) {
      const failureMessage = "O mesmo material foi informado mais de uma vez para a mesma revisao";
      summarizeGroupFailure(group.rows, failureMessage).forEach((detail) =>
        detailsByRow.set(detail.row, detail),
      );
      continue;
    }

    const conflicts = await checkKitRevisionConflicts(
      group.positionId,
      group.validFrom,
      null,
      group.existingDraft?.id,
    );
    const archivedConflicts = conflicts.filter((conflict) => !conflict.isActive);

    if (archivedConflicts.length > 0) {
      const conflict = archivedConflicts[0];
      const failureMessage = `Conflito de vigencia com a versao ${conflict.version} do cargo ${group.positionName}`;
      summarizeGroupFailure(group.rows, failureMessage).forEach((detail) =>
        detailsByRow.set(detail.row, detail),
      );
      continue;
    }

    for (const row of group.rows) {
      const diff = buildKitDiff(row);
      const classification: ImportClassification =
        row.classification === "UPDATE" && diff.length === 0 ? "UNCHANGED" : row.classification;

      detailsByRow.set(row.row, {
        row: row.row,
        success: true,
        classification,
        employeeName: describeKitRow(row),
        diff: diff.length > 0 ? diff : undefined,
      });
    }

    validGroups.push(group);
  }

  return { validGroups, detailsByRow };
}

function buildConflictWhere(
  positionId: string,
  from: Date,
  to?: Date | null,
  excludeId?: string,
): Prisma.KitRevisionWhereInput {
  return {
    positionId,
    id: excludeId ? { not: excludeId } : undefined,
    OR: [
      {
        validFrom: { lte: from },
        OR: [{ validTo: { gt: from } }, { validTo: null }],
      },
      ...(to
        ? [
            {
              validFrom: { lt: to },
              OR: [{ validTo: { gte: to } }, { validTo: null }],
            },
          ]
        : []),
      ...(to
        ? [
            {
              validFrom: { gte: from },
              validTo: { lte: to, not: null },
            },
          ]
        : []),
    ],
  };
}

async function applyKitGroupImport(group: KitGroupPlan, userId: string) {
  return await prisma.$transaction(async (tx) => {
    const conflicts = await tx.kitRevision.findMany({
      where: buildConflictWhere(group.positionId, group.validFrom, null, group.existingDraft?.id),
      select: {
        id: true,
        version: true,
        isActive: true,
      },
    });
    const archivedConflicts = conflicts.filter((conflict) => !conflict.isActive);
    if (archivedConflicts.length > 0) {
      throw new Error(
        `Conflito de vigencia com a versao ${archivedConflicts[0].version} do cargo ${group.positionName}`,
      );
    }

    const revision = group.existingDraft
      ? await tx.kitRevision.update({
          where: { id: group.existingDraft.id },
          data: {
            notes: group.notes,
          },
        })
      : await (async () => {
          const lastRevision = await tx.kitRevision.findFirst({
            where: { positionId: group.positionId },
            orderBy: { version: "desc" },
            select: { version: true },
          });

          return tx.kitRevision.create({
            data: {
              positionId: group.positionId,
              version: (lastRevision?.version ?? 0) + 1,
              notes: group.notes,
              validFrom: group.validFrom,
              isActive: false,
            },
          });
        })();

    for (const row of group.rows) {
      await tx.kitItem.upsert({
        where: {
          revisionId_materialId: {
            revisionId: revision.id,
            materialId: row.material.id,
          },
        },
        update: {
          quantity: row.data.quantity,
          periodDays: row.data.periodDays ?? null,
          mandatory: row.data.mandatory,
        },
        create: {
          revisionId: revision.id,
          materialId: row.material.id,
          quantity: row.data.quantity,
          periodDays: row.data.periodDays ?? null,
          mandatory: row.data.mandatory,
        },
      });
    }

    await logAudit({
      userId,
      action: group.existingDraft ? "UPDATE" : "CREATE",
      entity: "KitRevision",
      entityId: revision.id,
      details: `${group.existingDraft ? "Revisao de kit atualizada" : "Nova revisao de kit criada"} via importacao em massa para ${group.positionName}`,
      newValue: {
        positionId: group.positionId,
        positionName: group.positionName,
        version: revision.version,
        validFrom: revision.validFrom,
        itemCount: group.rows.length,
        source: "kit-bulk-import",
      },
    });

    return revision;
  });
}

function buildOrderedSummary(
  rowsLength: number,
  detailsByRow: Map<number, ImportDetail>,
): ImportSummary {
  const details = Array.from({ length: rowsLength }, (_, index) => {
    const rowNumber = index + 1;
    return (
      detailsByRow.get(rowNumber) ?? {
        row: rowNumber,
        success: false,
        classification: "ERROR" as const,
        errors: ["Linha nao processada"],
      }
    );
  });

  return {
    total: rowsLength,
    successCount: details.filter((detail) => detail.success).length,
    errorCount: details.filter((detail) => !detail.success).length,
    details,
  };
}

async function analyzeKitImport(rows: Record<string, unknown>[], mappings: Record<string, string>) {
  const referenceMaps = await loadKitReferenceMaps();
  const detailsByRow = new Map<number, ImportDetail>();
  const resolvedRows: ResolvedKitRow[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 1;
    const result = processKitPipelineRow(rows[index], mappings, referenceMaps);

    if (!result.success) {
      detailsByRow.set(rowNumber, {
        row: rowNumber,
        success: false,
        classification: result.classification ?? "ERROR",
        employeeName: undefined,
        errors: result.errors,
      });
      continue;
    }

    resolvedRows.push({
      row: rowNumber,
      data: result.data,
      groupKey: result.resolution.groupKey,
      position: result.resolution.position,
      material: result.resolution.material,
      existingDraft: result.resolution.existingDraft,
      classification: result.resolution.classification,
    });
  }

  const { validGroups, detailsByRow: groupDetails } = await validateKitGroups(resolvedRows);
  groupDetails.forEach((value, key) => detailsByRow.set(key, value));

  return {
    summary: buildOrderedSummary(rows.length, detailsByRow),
    validGroups,
  };
}

export async function getKitMappingSuggestionsAction(headers: string[]) {
  await requirePermission("MANAGE_POSITIONS", true);
  return autoDetectKitMappings(headers);
}

export async function validateKitImportAction(
  rows: Record<string, unknown>[],
  mappings: Record<string, string>,
): Promise<ImportSummary> {
  await requirePermission("MANAGE_POSITIONS", true);
  const { summary } = await analyzeKitImport(rows, mappings);
  return summary;
}

export async function importKitsAction(
  rows: Record<string, unknown>[],
  mappings: Record<string, string>,
): Promise<ImportSummary> {
  const session = await requirePermission("MANAGE_POSITIONS", true);
  const userId = session.user.id;

  const { summary, validGroups } = await analyzeKitImport(rows, mappings);
  const detailsByRow = new Map<number, ImportDetail>(
    summary.details.map((detail) => [detail.row, detail]),
  );

  for (const group of validGroups) {
    const groupDetails = group.rows
      .map((row) => detailsByRow.get(row.row))
      .filter(Boolean) as ImportDetail[];
    const hasBlockingError = groupDetails.some((detail) => !detail.success);
    if (hasBlockingError) {
      continue;
    }

    try {
      const revision = await applyKitGroupImport(group, userId);

      group.rows.forEach((row) => {
        const detail = detailsByRow.get(row.row);
        if (!detail) return;

        detail.employeeName = `${describeKitRow(row)} / v${revision.version}`;
        detailsByRow.set(row.row, detail);
      });
    } catch (error: unknown) {
      group.rows.forEach((row) => {
        detailsByRow.set(row.row, {
          row: row.row,
          success: false,
          classification: "ERROR",
          employeeName: describeKitRow(row),
          errors: [error instanceof Error ? error.message : "Erro inesperado na importacao do kit"],
        });
      });
    }
  }

  const finalSummary = buildOrderedSummary(rows.length, detailsByRow);

  await logAudit({
    userId,
    action: "IMPORT",
    entity: "KitBatch",
    entityId: `KIT_BATCH_${Date.now()}`,
    details: `Importacao de kits por cargo com ${rows.length} linhas (Sucesso: ${finalSummary.successCount}, Erro: ${finalSummary.errorCount})`,
    newValue: {
      filename: "Importacao em massa de kits",
      user: session.user.name || session.user.email,
      counts: {
        total: finalSummary.total,
        success: finalSummary.successCount,
        error: finalSummary.errorCount,
        create: finalSummary.details.filter((detail) => detail.classification === "CREATE").length,
        update: finalSummary.details.filter((detail) => detail.classification === "UPDATE").length,
        unchanged: finalSummary.details.filter((detail) => detail.classification === "UNCHANGED")
          .length,
      },
      items: finalSummary.details.slice(0, 100).map((detail) => ({
        r: detail.row,
        s: detail.success,
        c: detail.classification,
        n: detail.employeeName,
        diff: detail.diff,
        err: detail.errors,
      })),
    },
  });

  const touchedPositions = new Set<string>();
  validGroups.forEach((group) => touchedPositions.add(group.positionId));

  revalidatePath("/materiais/kits");
  revalidatePath("/materiais/kits/importacao");
  revalidatePath("/materiais/kits/importacao/historico");
  revalidatePath("/cargos");
  revalidatePath("/dashboard");
  revalidatePath("/cargos/importacao");
  revalidatePath("/cargos/importacao/historico");
  touchedPositions.forEach((positionId) => {
    revalidatePath(`/materiais/kits/${positionId}`);
    revalidatePath(`/cargos/${positionId}/kit`);
  });

  return finalSummary;
}
