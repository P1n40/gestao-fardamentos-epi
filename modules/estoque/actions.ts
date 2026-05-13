"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { MaterialSchema, StockMovementSchema } from "@/types/schemas";

import { recordStockMovement, getPlanningReport } from "./services";

export async function createMaterial(formData: FormData) {
  const session = await requirePermission("MANAGE_MATERIALS", true);
  const userId = session.user.id;

  const rawData = {
    name: formData.get("name"),
    category: formData.get("category"),
    stock: Number(formData.get("stock") || 0),
    minStock: Number(formData.get("minStock") || 0),
    description: formData.get("description"),
    unit: formData.get("unit"),
    size: formData.get("size"),
    caNumber: formData.get("caNumber"),
    sku: formData.get("sku"),
  };

  const validatedData = MaterialSchema.safeParse(rawData);

  if (!validatedData.success) {
    return { error: validatedData.error.flatten().fieldErrors };
  }

  try {
    const material = await prisma.$transaction(async (tx) => {
      const m = await tx.material.create({
        data: {
          ...validatedData.data,
          stock: 0, // Force initialization at 0, will update via ledger
        },
      });

      // Record initial stock movement if it's > 0
      if (validatedData.data.stock > 0) {
        await tx.stockTransaction.create({
          data: {
            materialId: m.id,
            type: "INPUT",
            quantity: validatedData.data.stock,
            balanceBefore: 0,
            balanceAfter: validatedData.data.stock,
            reason: "Saldo Inicial (Criação)",
            userId,
          },
        });

        return await tx.material.update({
          where: { id: m.id },
          data: { stock: validatedData.data.stock },
        });
      }

      return m;
    });

    await logAudit({
      userId,
      action: "CREATE",
      entity: "Material",
      entityId: material.id,
      newValue: material,
    });

    revalidatePath("/materiais/catalogo");
    revalidatePath("/estoque");
    return { success: true };
  } catch (err: any) {
    console.error(err);
    return { error: err.message || "Erro interno ao criar material" };
  }
}

export async function updateMaterial(id: string, formData: FormData) {
  const session = await requirePermission("MANAGE_MATERIALS", true);
  const userId = session.user.id;

  const oldMaterial = await prisma.material.findUnique({ where: { id } });
  if (!oldMaterial) throw new Error("Material não encontrado");

  const rawData = {
    name: formData.get("name"),
    category: formData.get("category"),
    minStock: Number(formData.get("minStock") || 0),
    description: formData.get("description"),
    unit: formData.get("unit"),
    size: formData.get("size"),
    caNumber: formData.get("caNumber"),
    sku: formData.get("sku"),
  };

  const validatedData = MaterialSchema.partial().safeParse(rawData);

  if (!validatedData.success) {
    return { error: validatedData.error.flatten().fieldErrors };
  }

  try {
    const material = await prisma.material.update({
      where: { id },
      data: {
        ...validatedData.data,
        stock: undefined, // NEVER allow updating stock balance directly via standard update
      },
    });

    await logAudit({
      userId,
      action: "UPDATE",
      entity: "Material",
      entityId: id,
      oldValue: oldMaterial,
      newValue: material,
    });

    revalidatePath("/materiais/catalogo");
    revalidatePath("/estoque");
    return { success: true };
  } catch (err: any) {
    console.error(err);
    return { error: err.message || "Erro interno ao atualizar material" };
  }
}

export async function toggleMaterialStatus(id: string) {
  const session = await requirePermission("MANAGE_MATERIALS", true);
  const userId = session.user.id;

  const oldMaterial = await prisma.material.findUnique({ where: { id } });
  if (!oldMaterial) throw new Error("Material não encontrado");

  try {
    const material = await prisma.material.update({
      where: { id },
      data: { active: !oldMaterial.active },
    });

    await logAudit({
      userId,
      action: "UPDATE",
      entity: "Material",
      entityId: id,
      oldValue: { active: oldMaterial.active },
      newValue: { active: material.active },
    });

    revalidatePath("/materiais/catalogo");
    revalidatePath("/estoque");
    return { success: true };
  } catch (err: any) {
    console.error(err);
    return { error: err.message || "Erro interno ao alterar status" };
  }
}

export async function addStockMovement(formData: FormData) {
  const session = await requirePermission("MANAGE_MATERIALS", true);
  const userId = session.user.id;

  const rawData = {
    materialId: formData.get("materialId"),
    type: formData.get("type"),
    quantity: Number(formData.get("quantity")),
    reason: formData.get("reason"),
    notes: formData.get("notes"),
  };

  const validatedData = StockMovementSchema.safeParse(rawData);

  if (!validatedData.success) {
    return { error: validatedData.error.flatten().fieldErrors };
  }

  try {
    await recordStockMovement(validatedData.data, userId);

    revalidatePath("/materiais/catalogo");
    revalidatePath("/estoque"); // Assuming we have or will have this path
    return { success: true };
  } catch (err: any) {
    // Audit blocked attempt if it's a known inventory error
    if (err.name === "InsufficientStockError") {
      await logAudit({
        userId,
        action: "BLOCKED_MOVEMENT",
        entity: "Material",
        entityId: validatedData.data.materialId,
        newValue: {
          error: err.message,
          requested: validatedData.data.quantity,
          reason: validatedData.data.reason,
        },
      });
    }

    console.error(err);
    return { error: err.message || "Erro interno ao registrar movimentação" };
  }
}

export async function fetchStockHistory(materialId: string) {
  await requirePermission("MANAGE_MATERIALS");
  try {
    const history = await prisma.stockTransaction.findMany({
      where: { materialId },
      include: {
        material: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { history };
  } catch (err) {
    console.error(err);
    return { error: "Erro ao carregar histórico" };
  }
}
