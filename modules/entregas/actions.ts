"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth-server";
import { DeliverySchema } from "@/types/schemas";

import {
  createDelivery,
  getDeliveries,
  getDeliveryById,
  getKitForEmployeeDelivery,
} from "./services";

export async function registerDelivery(formData: unknown) {
  const session = await requirePermission("MANAGE_DELIVERIES", true);
  const userId = session.user.id;

  try {
    let rawData = formData;

    if (
      typeof formData === "object" &&
      formData !== null &&
      "items" in formData &&
      typeof (formData as { items?: unknown }).items === "string"
    ) {
      try {
        rawData = {
          ...(formData as Record<string, unknown>),
          items: JSON.parse((formData as { items: string }).items),
        };
      } catch {
        return { error: "Itens da entrega em formato invalido." };
      }
    }

    const validatedData = DeliverySchema.safeParse(rawData);
    if (!validatedData.success) {
      return { error: validatedData.error.flatten().fieldErrors };
    }

    const result = await createDelivery(validatedData.data, userId);

    await logAudit({
      userId,
      action: "CREATE",
      entity: "Delivery",
      entityId: result.delivery.id,
      details: "Entrega registrada com sucesso",
      newValue: {
        type: validatedData.data.type,
        itemCount: validatedData.data.items.length,
        employeeId: validatedData.data.employeeId,
      },
    });

    revalidatePath("/entregas");
    revalidatePath("/colaboradores");
    revalidatePath(`/colaboradores/${validatedData.data.employeeId}`);

    return { success: true, deliveryId: result.delivery.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno ao processar entrega";

    if (message.includes("INATIVO") || message.includes("Conflito") || message.includes("estoque")) {
      await logAudit({
        userId,
        action: "BLOCKED_DELIVERY",
        entity: "Delivery",
        entityId: "SYSTEM",
        details: "Tentativa de entrega bloqueada por regra operacional",
        metadata: {
          error: message,
          input: formData,
        },
      });
    }

    return { error: message };
  }
}

export async function fetchDeliveries(options: {
  employeeId?: string;
  type?: "UNIFORM" | "PPE";
  limit?: number;
} = {}) {
  await requirePermission("MANAGE_DELIVERIES", true);

  try {
    return await getDeliveries(options);
  } catch {
    return [];
  }
}

export async function fetchDeliveryDetails(id: string) {
  await requirePermission("MANAGE_DELIVERIES", true);

  try {
    return await getDeliveryById(id);
  } catch {
    return null;
  }
}

export async function fetchKitForEmployee(employeeId: string, type: "UNIFORM" | "PPE") {
  await requirePermission("MANAGE_DELIVERIES", true);

  try {
    const items = await getKitForEmployeeDelivery(employeeId, type);
    return { items };
  } catch (error: unknown) {
    return {
      error: error instanceof Error ? error.message : "Erro ao buscar kit do colaborador.",
    };
  }
}
