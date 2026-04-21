"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { PositionSchema } from "@/types/schemas";

import * as positionService from "./services";

/**
 * Creates a new job position.
 * Only rh_almoxarifado or admin.
 */
export async function createPosition(formData: FormData) {
  const session = await requirePermission("MANAGE_POSITIONS", true);

  const rawData = {
    name: formData.get("name"),
    description: formData.get("description"),
    department: formData.get("department"),
    requiresUniform: formData.get("requiresUniform") === "on",
    requiresPPE: formData.get("requiresPPE") === "on",
  };

  const validated = PositionSchema.safeParse(rawData);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    const position = await positionService.createPosition(validated.data);

    await logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "Position",
      entityId: position.id,
      newValue: position,
    });

    revalidatePath("/cargos");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Erro ao criar cargo" };
  }
}

/**
 * Updates an existing job position.
 */
export async function updatePosition(id: string, formData: FormData) {
  const session = await requirePermission("MANAGE_POSITIONS", true);

  const oldPosition = await prisma.position.findUnique({ where: { id } });
  if (!oldPosition) throw new Error("Cargo não encontrado");

  const rawData = {
    name: formData.get("name"),
    description: formData.get("description"),
    department: formData.get("department"),
    requiresUniform: formData.get("requiresUniform") === "on",
    requiresPPE: formData.get("requiresPPE") === "on",
  };

  const validated = PositionSchema.safeParse(rawData);
  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  try {
    const position = await positionService.updatePosition(id, validated.data);

    await logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Position",
      entityId: id,
      oldValue: oldPosition,
      newValue: position,
    });

    revalidatePath("/cargos");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Erro ao atualizar cargo" };
  }
}

/**
 * Toggles a position's active status.
 */
export async function togglePositionStatus(id: string) {
  const session = await requirePermission("MANAGE_POSITIONS", true);

  try {
    const oldPosition = await prisma.position.findUnique({ where: { id } });
    const position = await positionService.togglePositionStatus(id);

    await logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Position",
      entityId: id,
      oldValue: { active: oldPosition?.active },
      newValue: { active: position.active },
    });

    revalidatePath("/cargos");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Erro ao alterar status do cargo" };
  }
}
