"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth-server";
import { KitTemplateItemSchema, KitTemplateLinkSchema, KitTemplateSchema } from "@/types/schemas";

import {
  createKitTemplate,
  deleteKitTemplateItem,
  linkKitTemplateToPosition,
  toggleKitTemplateStatus,
  updateKitTemplate,
  upsertKitTemplateItem,
} from "./templates-services";

function revalidateTemplatePages(templateId?: string, positionId?: string) {
  revalidatePath("/materiais/kits");
  revalidatePath("/materiais/kits/modelos");
  revalidatePath("/materiais/kits/vincular");
  revalidatePath("/cargos");

  if (templateId) {
    revalidatePath(`/materiais/kits/modelos/${templateId}`);
  }

  if (positionId) {
    revalidatePath(`/materiais/kits/${positionId}`);
    revalidatePath(`/cargos/${positionId}/kit`);
  }
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createKitTemplateAction(formData: FormData) {
  const session = await requirePermission("MANAGE_POSITIONS", true);
  const parsed = KitTemplateSchema.safeParse({
    name: getString(formData, "name"),
    description: getString(formData, "description") || null,
    active: getString(formData, "active") !== "false",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  try {
    const template = await createKitTemplate(parsed.data);

    await logAudit({
      userId: session.user.id,
      action: "CREATE",
      entity: "KitTemplate",
      entityId: template.id,
      newValue: template,
    });

    revalidateTemplatePages(template.id);
    return { success: true, id: template.id };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Erro ao criar modelo de kit.",
    };
  }
}

export async function updateKitTemplateAction(id: string, formData: FormData) {
  const session = await requirePermission("MANAGE_POSITIONS", true);
  const parsed = KitTemplateSchema.safeParse({
    name: getString(formData, "name"),
    description: getString(formData, "description") || null,
    active: getString(formData, "active") !== "false",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  try {
    const template = await updateKitTemplate(id, parsed.data);

    await logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "KitTemplate",
      entityId: id,
      newValue: template,
    });

    revalidateTemplatePages(id);
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Erro ao atualizar modelo de kit.",
    };
  }
}

export async function toggleKitTemplateStatusAction(id: string) {
  const session = await requirePermission("MANAGE_POSITIONS", true);

  try {
    const template = await toggleKitTemplateStatus(id);

    await logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "KitTemplate",
      entityId: id,
      newValue: { active: template.active },
    });

    revalidateTemplatePages(id);
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Erro ao alterar status do modelo.",
    };
  }
}

export async function saveKitTemplateItemAction(formData: FormData) {
  const session = await requirePermission("MANAGE_POSITIONS", true);
  const parsed = KitTemplateItemSchema.safeParse({
    templateId: getString(formData, "templateId"),
    materialId: getString(formData, "materialId"),
    quantity: Number(formData.get("quantity")),
    periodDays: getString(formData, "periodDays") ? Number(formData.get("periodDays")) : null,
    mandatory: getString(formData, "mandatory") !== "false",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  try {
    const item = await upsertKitTemplateItem(parsed.data);

    await logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "KitTemplateItem",
      entityId: item.id,
      newValue: item,
    });

    revalidateTemplatePages(parsed.data.templateId);
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Erro ao salvar item do modelo.",
    };
  }
}

export async function removeKitTemplateItemAction(id: string, templateId: string) {
  const session = await requirePermission("MANAGE_POSITIONS", true);

  try {
    const item = await deleteKitTemplateItem(id);

    await logAudit({
      userId: session.user.id,
      action: "DELETE",
      entity: "KitTemplateItem",
      entityId: id,
      oldValue: item,
    });

    revalidateTemplatePages(templateId);
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Erro ao remover item do modelo.",
    };
  }
}

export async function linkKitTemplateToPositionAction(formData: FormData) {
  const session = await requirePermission("MANAGE_POSITIONS", true);
  const parsed = KitTemplateLinkSchema.safeParse({
    templateId: getString(formData, "templateId"),
    positionId: getString(formData, "positionId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await linkKitTemplateToPosition(parsed.data);

    await logAudit({
      userId: session.user.id,
      action: "LINK",
      entity: "KitTemplate",
      entityId: parsed.data.templateId,
      details: `Modelo de kit vinculado ao cargo ${result.position.name}`,
      newValue: {
        templateId: parsed.data.templateId,
        templateName: result.template.name,
        positionId: parsed.data.positionId,
        positionName: result.position.name,
        revisionId: result.revision.id,
        revisionVersion: result.revision.version,
      },
    });

    revalidateTemplatePages(parsed.data.templateId, parsed.data.positionId);
    return { success: true, revisionId: result.revision.id, positionId: parsed.data.positionId };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Erro ao vincular modelo ao cargo.",
    };
  }
}
