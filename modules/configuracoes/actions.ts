"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { ExplicitConfirmationSchema, InitialStockSchema } from "@/types/schemas";
import { PERMISSION_DEFINITIONS, Permission } from "@/lib/auth-utils";

const STOCK_INITIALIZED_KEY = "stock_initialized";

function toJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

export async function getStockInitializationStatus() {
  const [setting, transactionCount] = await Promise.all([
    prisma.systemSetting.findUnique({
      where: { key: STOCK_INITIALIZED_KEY },
      select: { value: true },
    }),
    prisma.stockTransaction.count(),
  ]);

  const settingValue = setting?.value as { initialized?: boolean } | undefined;
  return Boolean(settingValue?.initialized || transactionCount > 0);
}

export async function initializeStock(formData: FormData) {
  const session = await requirePermission("ESTOQUE_INICIALIZAR", true);

  const rawItems = String(formData.get("items") ?? "[]");
  let items: unknown;

  try {
    items = JSON.parse(rawItems);
  } catch {
    return { error: "Itens da entrada inicial estão em formato inválido." };
  }

  const parsed = InitialStockSchema.safeParse({
    confirmation: formData.get("confirmation"),
    reason: formData.get("reason"),
    items,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const setting = await tx.systemSetting.findUnique({
        where: { key: STOCK_INITIALIZED_KEY },
      });
      const settingValue = setting?.value as { initialized?: boolean } | undefined;
      const existingTransactions = await tx.stockTransaction.count();

      if (settingValue?.initialized || existingTransactions > 0) {
        throw new Error("O estoque inicial já foi registrado e não pode ser executado novamente.");
      }

      const materialIds = parsed.data.items.map((item) => item.materialId);
      const materials = await tx.material.findMany({
        where: {
          id: { in: materialIds },
          active: true,
        },
        select: {
          id: true,
          name: true,
          stock: true,
          unit: true,
        },
      });
      const materialsById = new Map(materials.map((material) => [material.id, material]));

      for (const item of parsed.data.items) {
        const material = materialsById.get(item.materialId);
        if (!material) {
          throw new Error("A entrada inicial contém material inexistente ou inativo.");
        }

        const balanceBefore = material.stock;
        const balanceAfter = item.quantity;
        const delta = balanceAfter - balanceBefore;

        await tx.stockTransaction.create({
          data: {
            materialId: item.materialId,
            type: balanceBefore === 0 ? "INPUT" : "ADJUSTMENT",
            quantity: delta,
            balanceBefore,
            balanceAfter,
            reason: "ENTRADA_INICIAL_OFICIAL",
            notes: item.notes || parsed.data.reason,
            userId: session.user.id,
          },
        });

        await tx.material.update({
          where: { id: item.materialId },
          data: {
            stock: balanceAfter,
            unit: item.unit,
          },
        });
      }

      await tx.systemSetting.upsert({
        where: { key: STOCK_INITIALIZED_KEY },
        update: {
          value: toJson({
            initialized: true,
            initializedAt: new Date().toISOString(),
            initializedBy: session.user.id,
          }),
        },
        create: {
          key: STOCK_INITIALIZED_KEY,
          value: toJson({
            initialized: true,
            initializedAt: new Date().toISOString(),
            initializedBy: session.user.id,
          }),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "ESTOQUE_INICIALIZAR",
          entity: "Stock",
          details: "Entrada inicial oficial de materiais executada",
          newValue: toJson(parsed.data.items),
          metadata: toJson({
            reason: parsed.data.reason,
            itemCount: parsed.data.items.length,
          }),
        },
      });
    });

    revalidatePath("/estoque");
    revalidatePath("/configuracoes/manutencao");
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Erro ao inicializar estoque.",
    };
  }
}

export async function resetStockBase(formData: FormData) {
  const session = await requirePermission("ESTOQUE_ZERAR", true);
  const parsed = ExplicitConfirmationSchema.safeParse({
    confirmation: formData.get("confirmation"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const materials = await tx.material.findMany({
        where: { stock: { not: 0 } },
        select: { id: true, name: true, stock: true },
      });

      for (const material of materials) {
        await tx.stockTransaction.create({
          data: {
            materialId: material.id,
            type: "ADJUSTMENT",
            quantity: -material.stock,
            balanceBefore: material.stock,
            balanceAfter: 0,
            reason: "ZERAR_BASE_ESTOQUE",
            notes: parsed.data.reason,
            userId: session.user.id,
          },
        });
      }

      await tx.material.updateMany({
        where: { stock: { not: 0 } },
        data: { stock: 0 },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "ESTOQUE_ZERAR",
          entity: "Stock",
          details: "Base de estoque zerada por manutenção administrativa",
          oldValue: toJson(materials),
          newValue: toJson({ affectedMaterials: materials.length, stock: 0 }),
          metadata: toJson({ reason: parsed.data.reason }),
        },
      });
    });

    revalidatePath("/estoque");
    revalidatePath("/configuracoes/manutencao");
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Erro ao zerar base de estoque.",
    };
  }
}

export async function resetEmployeeBase(formData: FormData) {
  const session = await requirePermission("FUNCIONARIOS_ZERAR", true);
  const parsed = ExplicitConfirmationSchema.safeParse({
    confirmation: formData.get("confirmation"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const activeEmployees = await tx.employee.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          documentId: true,
          registrationCode: true,
          department: true,
          positionId: true,
        },
      });

      await tx.employee.updateMany({
        where: { active: true },
        data: { active: false },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "FUNCIONARIOS_ZERAR",
          entity: "Employee",
          details: "Base ativa de funcionários zerada por manutenção administrativa",
          oldValue: toJson(activeEmployees),
          newValue: toJson({ activeEmployees: 0 }),
          metadata: toJson({
            reason: parsed.data.reason,
            affectedEmployees: activeEmployees.length,
            mode: "soft_delete",
          }),
        },
      });
    });

    revalidatePath("/colaboradores");
    revalidatePath("/configuracoes/manutencao");
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Erro ao zerar base de funcionários.",
    };
  }
}

export async function updateProfilePermissions(profileId: string, permissions: Permission[]) {
  const session = await requirePermission("MANAGE_PROFILES", true);
  const allowedCodes = new Set(PERMISSION_DEFINITIONS.map((permission) => permission.code));
  const uniquePermissions = Array.from(new Set(permissions));

  if (uniquePermissions.some((permission) => !allowedCodes.has(permission))) {
    return { error: "Lista de permissões contém itens inválidos." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const profile = await tx.accessProfile.findUnique({
        where: { id: profileId },
        include: { permissions: true },
      });

      if (!profile) {
        throw new Error("Perfil não encontrado.");
      }

      await tx.profilePermission.deleteMany({
        where: { profileId },
      });

      await tx.profilePermission.createMany({
        data: uniquePermissions.map((code) => {
          const definition = PERMISSION_DEFINITIONS.find((permission) => permission.code === code);
          return {
            profileId,
            code,
            route: definition?.route ?? "/",
            action: definition?.action ?? "executar",
            description: definition?.description ?? code,
          };
        }),
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "PROFILE_PERMISSIONS_UPDATE",
          entity: "AccessProfile",
          entityId: profileId,
          details: `Permissões do perfil ${profile.name} atualizadas`,
          oldValue: toJson(profile.permissions.map((permission) => permission.code)),
          newValue: toJson(uniquePermissions),
        },
      });
    });

    revalidatePath("/configuracoes/perfis");
    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Erro ao atualizar permissões.",
    };
  }
}
