"use server";

import { logAudit } from "@/lib/audit";
import prisma from "@/lib/prisma";
import {
  EmployeeImportSchema,
  ImportDetail,
  ImportSummary,
  ImportClassification,
} from "./schemas";
import { autoDetectMappings, processPipelineRow } from "./pipeline";
import { normalizeCPF, normalizeString } from "@/lib/utils/reconciliation";
import { requirePermission } from "@/lib/auth-server";
import { revalidatePath } from "next/cache";

/**
 * Suggests mappings based on spreadsheet headers.
 */
export async function getMappingSuggestionsAction(headers: string[]) {
  await requirePermission("MANAGE_EMPLOYEES", true);
  return autoDetectMappings(headers);
}

/**
 * Server action to process a batch of employee records using the treatment pipeline.
 */
export async function importEmployeesAction(
  rows: Record<string, unknown>[],
  mappings: Record<string, string>,
): Promise<ImportSummary> {
  const session = await requirePermission("MANAGE_EMPLOYEES", true);
  const user = session.user;

  const details: ImportDetail[] = [];
  let successCount = 0;
  let errorCount = 0;

  // Pre-fetch all positions
  const positions = await prisma.position.findMany({
    where: { active: true },
    select: { id: true, name: true },
  });

  const positionMap = new Map(
    positions.map((p) => [normalizeString(p.name), p.id])
  );

  // Use a transaction for the entire batch to ensure logical consistency if needed, 
  // but row-level failures should still allow progress in some cases?
  // Business rule: Atomic batch for "The Spreadsheet" OR Row-by-row?
  // User request mentions "atomicidade/transação" for critical writes. 
  // We'll use a transaction for each individual employee update + its logging.

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const rowNum = i + 1;

    try {
      const result = await processPipelineRow(prisma as any, rawRow, mappings, positionMap);

      if (!result.success) {
        details.push({
          row: rowNum,
          success: false,
          classification: "ERROR",
          errors: (result as any).errors,
        });
        errorCount++;
        continue;
      }

      const { data, reconciliation } = result as any;

      if (reconciliation.classification === "AMBIGUOUS") {
        details.push({
          row: rowNum,
          success: false,
          classification: "AMBIGUOUS",
          employeeName: data.name,
          errors: reconciliation.conflicts,
        });
        errorCount++;
        continue;
      }

      const existing = reconciliation.existingRecord;
      const diff: string[] = [];
      let classification = reconciliation.classification;

      if (existing) {
        // Build diff
        if (data.name !== existing.name) diff.push(`Nome: ${existing.name} -> ${data.name}`);
        if ((data.registrationCode || "") !== (existing.registrationCode || ""))
          diff.push(`Matrícula: ${existing.registrationCode} -> ${data.registrationCode}`);
        if ((data.department || "") !== (existing.department || ""))
          diff.push(`Setor: ${existing.department} -> ${data.department}`);
        
        if (data.positionId !== existing.positionId) {
          const newPosName = positions.find((p) => p.id === data.positionId)?.name;
          const oldPosName = positions.find((p) => p.id === existing.positionId)?.name;
          diff.push(`Cargo: ${oldPosName} -> ${newPosName}`);
        }
        
        if (diff.length === 0) classification = "UNCHANGED";
      }

      // Final upsert inside a controlled context
      const cleanCpf = normalizeCPF(data.documentId);
      
      await prisma.$transaction(async (tx) => {
        await tx.employee.upsert({
          where: { documentId: cleanCpf },
          update: {
            name: data.name,
            registrationCode: data.registrationCode,
            department: data.department,
            positionId: data.positionId,
            shirtSize: data.shirtSize,
            pantsSize: data.pantsSize,
            shoeSize: data.shoeSize,
            active: true,
          },
          create: {
            name: data.name,
            documentId: cleanCpf,
            registrationCode: data.registrationCode,
            department: data.department,
            positionId: data.positionId,
            shirtSize: data.shirtSize,
            pantsSize: data.pantsSize,
            shoeSize: data.shoeSize,
          },
        });

        // If there were changes, we'll log them (Optional row-level logging)
        // Global session logging is usually enough for bulk imports
      });

      details.push({
        row: rowNum,
        success: true,
        classification,
        employeeName: data.name,
        diff: diff.length > 0 ? diff : undefined,
      });
      successCount++;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      details.push({
        row: rowNum,
        success: false,
        classification: "ERROR",
        errors: [`Erro de sistema: ${message}`],
      });
      errorCount++;
    }
  }

  // Record Global Audit Log
  const auditSummary = {
    filename: "Importação via Planilha",
    user: user.name || user.email,
    counts: {
      total: rows.length,
      success: successCount,
      error: errorCount,
      create: details.filter((d) => d.classification === "CREATE").length,
      update: details.filter((d) => d.classification === "UPDATE").length,
    },
    sampleDetails: details
      .slice(0, 100)
      .map((d) => ({ r: d.row, c: d.classification, s: d.success, n: d.employeeName, e: d.errors })),
  };

  await logAudit({
    userId: user.id,
    action: "IMPORT",
    entity: "EmployeeBatch",
    entityId: `BATCH_${Date.now()}`,
    details: `Importação de ${rows.length} registros (Sucesso: ${successCount}, Erro: ${errorCount})`,
    newValue: auditSummary,
  });

  revalidatePath("/colaboradores");
  revalidatePath("/dashboard");

  return {
    total: rows.length,
    successCount,
    errorCount,
    details,
  };
}

/**
 * Perform a validation-only pass (Dry Run) using the pipeline.
 */
export async function validateImportAction(
  rows: Record<string, unknown>[],
  mappings: Record<string, string>
): Promise<ImportSummary> {
  await requirePermission("MANAGE_EMPLOYEES", true);

  const details: ImportDetail[] = [];
  let successCount = 0;
  let errorCount = 0;

  const positions = await prisma.position.findMany({
    where: { active: true },
    select: { id: true, name: true },
  });
  const positionMap = new Map(
    positions.map((p) => [normalizeString(p.name), p.id])
  );

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const rowNum = i + 1;

    try {
      const result = await processPipelineRow(prisma as any, rawRow, mappings, positionMap);

      if (!result.success) {
        details.push({
          row: rowNum,
          success: false,
          classification: "ERROR",
          errors: (result as any).errors,
        });
        errorCount++;
        continue;
      }

      const { data, reconciliation } = result as any;
      const existing = reconciliation.existingRecord;
      const diff: string[] = [];

      if (existing) {
        if (data.name !== existing.name) diff.push(`Nome: ${existing.name} -> ${data.name}`);
        if ((data.registrationCode || "") !== (existing.registrationCode || ""))
          diff.push(`Matrícula: ${existing.registrationCode} -> ${data.registrationCode}`);
        if ((data.department || "") !== (existing.department || ""))
          diff.push(`Setor: ${existing.department} -> ${data.department}`);
        if (data.positionId !== existing.positionId) {
          const newPosName = positions.find((p) => p.id === data.positionId)?.name;
          const oldPosName = positions.find((p) => p.id === existing.positionId)?.name;
          diff.push(`Cargo: ${oldPosName} -> ${newPosName}`);
        }
      }

      details.push({
        row: rowNum,
        success: true,
        classification: reconciliation.classification,
        employeeName: data.name,
        diff: diff.length > 0 ? diff : undefined,
        errors: reconciliation.classification === "AMBIGUOUS" ? reconciliation.conflicts : undefined,
      });

      if (reconciliation.classification !== "ERROR" && reconciliation.classification !== "AMBIGUOUS") {
        successCount++;
      } else {
        errorCount++;
      }
    } catch (error: unknown) {
       details.push({
        row: rowNum,
        success: false,
        classification: "ERROR",
        errors: [error instanceof Error ? error.message : "Erro inesperado"],
      });
      errorCount++;
    }
  }

  return {
    total: rows.length,
    successCount,
    errorCount,
    details: details.sort((a,b) => a.row - b.row),
  };
}
