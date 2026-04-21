import { z } from "zod";

import prisma from "@/lib/prisma";
import { KitSchema, KitRevisionSchema } from "@/types/schemas";

/**
 * Retrieves the currently active kit revision for a specific position.
 */
export async function getActiveRevisionByPosition(positionId: string) {
  return await prisma.kitRevision.findFirst({
    where: { positionId, isActive: true },
    include: {
      items: {
        include: {
          material: true,
        },
        orderBy: {
          material: { name: "asc" },
        },
      },
    },
    orderBy: { validFrom: "desc" },
  });
}

/**
 * Compatible helper for older calls (getting active kit items).
 */
export async function getKitsByPosition(positionId: string) {
  const revision = await getActiveRevisionByPosition(positionId);
  return revision?.items || [];
}

/**
 * Retrieves all kit revisions for a specific position.
 */
export async function getRevisionsByPosition(positionId: string) {
  return await prisma.kitRevision.findMany({
    where: { positionId },
    orderBy: { version: "desc" },
  });
}

/**
 * Retrieves a specific kit revision by ID.
 */
export async function getRevisionById(id: string) {
  return await prisma.kitRevision.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          material: true,
        },
        orderBy: {
          material: { name: "asc" },
        },
      },
    },
  });
}

/**
 * Checks for overlapping validity periods for a position's kits.
 * Returns overlapping revisions if found.
 */
export async function checkKitRevisionConflicts(
  positionId: string,
  from: Date,
  to?: Date | null,
  excludeId?: string,
) {
  return await prisma.kitRevision.findMany({
    where: {
      positionId,
      id: excludeId ? { not: excludeId } : undefined,
      OR: [
        // Case 1: Proposed range starts during an existing range
        {
          validFrom: { lte: from },
          OR: [{ validTo: { gt: from } }, { validTo: null }],
        },
        // Case 2: Proposed range ends during an existing range
        ...(to
          ? [
              {
                validFrom: { lt: to },
                OR: [{ validTo: { gte: to } }, { validTo: null }],
              },
            ]
          : []),
        // Case 3: Proposed range completely covers an existing range
        ...(to
          ? [
              {
                validFrom: { gte: from },
                validTo: { lte: to, not: null },
              },
            ]
          : []),
      ],
    },
  });
}

/**
 * Creates a new kit revision.
 * If cloneFromId is provided, copies items from that revision.
 */
export async function createKitRevision(
  data: z.infer<typeof KitRevisionSchema>,
  cloneFromId?: string,
) {
  const fromDate = data.validFrom || new Date();

  // Basic check: don't allow creating a revision that conflicts with existing history
  // unless we are in the future.
  const conflicts = await checkKitRevisionConflicts(data.positionId, fromDate);
  // We allow conflict if it overlaps with an ACTIVE kit, because activateRevision will truncate it.
  // But if it overlaps with an ARCHIVED kit, it's a structural conflict.
  const archivedConflicts = conflicts.filter((c) => !c.isActive);

  if (archivedConflicts.length > 0) {
    throw new Error(
      `Conflito de vigência: a data informada sobrepõe a Versão ${archivedConflicts[0].version}`,
    );
  }

  return await prisma.$transaction(async (tx) => {
    // Determine next version number
    const lastRevision = await tx.kitRevision.findFirst({
      where: { positionId: data.positionId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (lastRevision?.version || 0) + 1;

    // Create the new revision
    const revision = await tx.kitRevision.create({
      data: {
        positionId: data.positionId,
        version: nextVersion,
        notes: data.notes,
        validFrom: fromDate,
        isActive: false, // Start as inactive/draft
      },
    });

    // Clone items if requested
    if (cloneFromId) {
      const sourceItems = await tx.kitItem.findMany({
        where: { revisionId: cloneFromId },
      });

      if (sourceItems.length > 0) {
        await tx.kitItem.createMany({
          data: sourceItems.map((item) => ({
            revisionId: revision.id,
            materialId: item.materialId,
            quantity: item.quantity,
            periodDays: item.periodDays,
            mandatory: item.mandatory,
          })),
        });
      }
    }

    return revision;
  });
}

/**
 * Activates a kit revision and sets validTo for the previous active one.
 * Ensures precise non-overlapping validity.
 */
export async function activateRevision(revisionId: string) {
  return await prisma.$transaction(async (tx) => {
    const revision = await tx.kitRevision.findUnique({
      where: { id: revisionId },
    });

    if (!revision) throw new Error("Revisão não encontrada");

    const now = new Date();

    // Secondary safety check: ensure we are not "back-publishing" into archived territory
    const conflicts = await checkKitRevisionConflicts(revision.positionId, now, null, revisionId);
    const archivedConflicts = conflicts.filter((c) => !c.isActive);

    if (archivedConflicts.length > 0) {
      throw new Error(
        `Impossível publicar agora: conflito com histórico da Versão ${archivedConflicts[0].version}`,
      );
    }

    // Deactivate currently active revision for this position
    // We set validTo to exactly when the new one starts
    await tx.kitRevision.updateMany({
      where: { positionId: revision.positionId, isActive: true },
      data: { isActive: false, validTo: now },
    });

    // Activate the new one
    return await tx.kitRevision.update({
      where: { id: revisionId },
      data: { isActive: true, validFrom: now, validTo: null },
    });
  });
}

/**
 * Adds or updates a material item in a specific revision.
 * Validates against position requirements.
 */
export async function upsertKitItem(data: z.infer<typeof KitSchema>) {
  const revision = await prisma.kitRevision.findUnique({
    where: { id: data.revisionId },
    include: { position: true },
  });

  if (!revision) throw new Error("Revisão não encontrada");

  const material = await prisma.material.findUnique({
    where: { id: data.materialId },
  });

  if (!material) throw new Error("Material não encontrado");

  if (!material.active) throw new Error("Material inativo nao pode ser incluido em novos kits.");

  // Rule Enforcement: Fardamento vs EPI logic separation
  if (material.category === "UNIFORM" && !revision.position.requiresUniform) {
    throw new Error(
      `O cargo "${revision.position.name}" está configurado para NÃO exigir fardamento.`,
    );
  }

  if (material.category === "PPE" && !revision.position.requiresPPE) {
    throw new Error(`O cargo "${revision.position.name}" está configurado para NÃO exigir EPI.`);
  }

  return await prisma.kitItem.upsert({
    where: {
      revisionId_materialId: {
        revisionId: data.revisionId,
        materialId: data.materialId,
      },
    },
    update: {
      quantity: data.quantity,
      periodDays: data.periodDays,
      mandatory: data.mandatory,
    },
    create: {
      revisionId: data.revisionId,
      materialId: data.materialId,
      quantity: data.quantity,
      periodDays: data.periodDays,
      mandatory: data.mandatory,
    },
  });
}

/**
 * Deletes a kit item from a revision.
 */
export async function deleteKitItem(id: string) {
  return await prisma.kitItem.delete({
    where: { id },
  });
}

/**
 * Updates a revision's notes.
 */
export async function updateRevisionNotes(id: string, notes: string) {
  return await prisma.kitRevision.update({
    where: { id },
    data: { notes },
  });
}
