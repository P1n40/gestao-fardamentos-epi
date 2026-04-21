"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth-server";
import { KitSchema, KitRevisionSchema } from "@/types/schemas";

import {
  upsertKitItem,
  deleteKitItem,
  createKitRevision,
  activateRevision,
  updateRevisionNotes,
} from "./services";

/**
 * Creates a new kit version (cloning if requested).
 */
export async function createNewKitVersion(formData: FormData) {
  const session = await requirePermission("MANAGE_POSITIONS", true);
  const userId = session.user.id;

  const positionId = formData.get("positionId") as string;
  const cloneFromId = (formData.get("cloneFromId") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  const validatedData = KitRevisionSchema.safeParse({ positionId, notes });

  if (!validatedData.success) {
    return { error: validatedData.error.flatten().fieldErrors };
  }

  try {
    const revision = await createKitRevision(validatedData.data, cloneFromId || undefined);

    await logAudit({
      userId,
      action: "CREATE",
      entity: "KitRevision",
      entityId: revision.id,
      newValue: revision,
    });

    revalidatePath(`/cargos/${positionId}/kit`);
    return { success: true, id: revision.id };
  } catch (err: any) {
    if (err.message && err.message.includes("Conflito")) {
      return { error: err.message };
    }
    console.error(err);
    return { error: "Erro interno ao criar nova versão do kit" };
  }
}

/**
 * Activates/Publishes a kit version (Start validity).
 */
export async function publishKitVersion(revisionId: string, positionId: string) {
  const session = await requirePermission("MANAGE_POSITIONS", true);
  const userId = session.user.id;

  try {
    const revision = await activateRevision(revisionId);

    await logAudit({
      userId,
      action: "UPDATE",
      entity: "KitRevision",
      entityId: revisionId,
      newValue: { isActive: true, validFrom: revision.validFrom },
    });

    revalidatePath(`/cargos/${positionId}/kit`);
    return { success: true };
  } catch (err: any) {
    if (err.message && (err.message.includes("Conflito") || err.message.includes("Impossível"))) {
      return { error: err.message };
    }
    console.error(err);
    return { error: "Erro interno ao publicar versão do kit" };
  }
}

/**
 * Updates the notes of a kit revision.
 */
export async function updateKitNotes(revisionId: string, positionId: string, notes: string) {
  await requirePermission("MANAGE_POSITIONS", true);

  try {
    await updateRevisionNotes(revisionId, notes);
    revalidatePath(`/cargos/${positionId}/kit`);
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Erro ao atualizar notas" };
  }
}

/**
 * Saves or updates a kit item configuration in a specific revision.
 */
export async function saveKitItem(formData: FormData) {
  const session = await requirePermission("MANAGE_POSITIONS", true);
  const userId = session.user.id;

  const positionId = formData.get("positionId") as string;
  const rawData = {
    revisionId: formData.get("revisionId") as string,
    materialId: formData.get("materialId") as string,
    quantity: Number(formData.get("quantity")),
    periodDays: formData.get("periodDays") ? Number(formData.get("periodDays")) : null,
    mandatory: formData.get("mandatory") === "true",
  };

  const validatedData = KitSchema.safeParse(rawData);

  if (!validatedData.success) {
    return { error: validatedData.error.flatten().fieldErrors };
  }

  try {
    const kitItem = await upsertKitItem(validatedData.data);

    await logAudit({
      userId,
      action: "UPDATE",
      entity: "KitItem",
      entityId: kitItem.id,
      newValue: kitItem,
    });

    revalidatePath(`/cargos/${positionId}/kit`);
    return { success: true };
  } catch (err: any) {
    console.error(err);
    return { error: "Erro interno ao salvar item do kit" };
  }
}

/**
 * Removes an item from a kit revision.
 */
export async function removeKitItem(id: string, positionId: string) {
  const session = await requirePermission("MANAGE_POSITIONS", true);
  const userId = session.user.id;

  try {
    const kitItem = await deleteKitItem(id);

    await logAudit({
      userId,
      action: "DELETE",
      entity: "KitItem",
      entityId: id,
      oldValue: kitItem,
    });

    revalidatePath(`/cargos/${positionId}/kit`);
    return { success: true };
  } catch (err: any) {
    console.error(err);
    return { error: "Erro interno ao remover item do kit" };
  }
}
