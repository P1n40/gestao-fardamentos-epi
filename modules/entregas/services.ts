import { z } from "zod";

import { InsufficientStockError } from "@/lib/inventory-errors";
import prisma from "@/lib/prisma";
import { DeliverySchema } from "@/types/schemas";

import { registerDocument } from "../documentos/services";

export type CreateDeliveryData = z.infer<typeof DeliverySchema>;

export function assertMaterialsMatchDeliveryType(
  materials: Array<{ name: string; category: "UNIFORM" | "PPE" }>,
  type: "UNIFORM" | "PPE",
) {
  for (const material of materials) {
    if (material.category !== type) {
      throw new Error(
        `Conflito de categoria: O material "${material.name}" e ${material.category}, mas a entrega e de ${type}.`,
      );
    }
  }
}

export function calculateAssignmentExpiryDate(params: {
  type: "UNIFORM" | "PPE";
  periodDays?: number | null;
  baseDate?: Date;
}) {
  const { type, periodDays, baseDate = new Date() } = params;

  if (type !== "PPE" || !periodDays) {
    return null;
  }

  const expiresAt = new Date(baseDate);
  expiresAt.setDate(expiresAt.getDate() + periodDays);
  return expiresAt;
}

export async function createDelivery(data: CreateDeliveryData, userId: string) {
  return await prisma.$transaction(async (tx) => {
    const employee = await tx.employee.findUnique({
      where: { id: data.employeeId },
      include: { position: true },
    });

    if (!employee) throw new Error("Colaborador nao encontrado");

    if (!employee.active) {
      throw new Error("Nao e possivel realizar entregas para um colaborador INATIVO.");
    }

    const materialIds = data.items.map((item) => item.materialId);
    const materials = await tx.material.findMany({
      where: { id: { in: materialIds } },
    });

    assertMaterialsMatchDeliveryType(
      materials.map((material) => ({
        name: material.name,
        category: material.category,
      })),
      data.type,
    );

    const delivery = await tx.delivery.create({
      data: {
        employeeId: data.employeeId,
        type: data.type,
        userId,
        notes: data.notes,
        issuedAt: new Date(),
      },
    });

    const results = [];

    const kitItems =
      data.type === "PPE"
        ? await tx.kitItem.findMany({
            where: {
              materialId: { in: materialIds },
              revision: { positionId: employee.positionId, isActive: true },
            },
          })
        : [];

    for (const item of data.items) {
      const material = materials.find((candidate) => candidate.id === item.materialId);
      if (!material) throw new Error(`Material ${item.materialId} nao encontrado`);

      const balanceBefore = material.stock;
      const balanceAfter = balanceBefore - item.quantity;

      if (balanceAfter < 0) {
        throw new InsufficientStockError(material.name, balanceBefore, item.quantity);
      }

      await tx.stockTransaction.create({
        data: {
          materialId: material.id,
          type: "OUTPUT",
          quantity: -item.quantity,
          balanceBefore,
          balanceAfter,
          reason: `Entrega #${delivery.id}`,
          userId,
        },
      });

      await tx.material.update({
        where: { id: material.id },
        data: { stock: balanceAfter },
      });

      const expiresAt = calculateAssignmentExpiryDate({
        type: data.type,
        periodDays: kitItems.find((kitItem) => kitItem.materialId === item.materialId)?.periodDays,
        baseDate: delivery.issuedAt,
      });

      const deliveryItem = await tx.deliveryItem.create({
        data: {
          deliveryId: delivery.id,
          materialId: item.materialId,
          quantity: item.quantity,
          isReplacement: item.isReplacement,
          caNumber: item.caNumber || material.caNumber,
        },
      });

      const assignment = await tx.assignment.create({
        data: {
          employeeId: data.employeeId,
          materialId: item.materialId,
          quantity: item.quantity,
          type: data.type,
          status: "ISSUED",
          caNumber: item.caNumber || material.caNumber,
          isReplacement: item.isReplacement,
          issuedAt: delivery.issuedAt,
          expiresAt,
          deliveryItemId: deliveryItem.id,
        },
      });

      results.push({ deliveryItem, assignment });
    }

    const document = await registerDocument(
      {
        type: data.type,
        employeeId: data.employeeId,
        deliveryId: delivery.id,
        version: 1,
        metadata: {
          items: data.items.map((entry) => ({
            materialId: entry.materialId,
            quantity: entry.quantity,
            caNumber: entry.caNumber,
            isReplacement: entry.isReplacement,
          })),
          employeeName: employee.name,
          employeeDoc: employee.documentId,
        },
      },
      userId,
      tx,
    );

    return { delivery: { ...delivery, document }, results };
  });
}

export async function getDeliveries(
  options: {
    employeeId?: string;
    type?: "UNIFORM" | "PPE";
    limit?: number;
  } = {},
) {
  return await prisma.delivery.findMany({
    where: {
      employeeId: options.employeeId,
      type: options.type,
    },
    include: {
      employee: true,
      user: true,
      document: true,
      items: {
        include: {
          material: true,
        },
      },
    },
    orderBy: { issuedAt: "desc" },
    take: options.limit || 50,
  });
}

export async function getDeliveryById(id: string) {
  return await prisma.delivery.findUnique({
    where: { id },
    include: {
      employee: {
        include: { position: true },
      },
      user: true,
      document: true,
      items: {
        include: {
          material: true,
          assignment: true,
        },
      },
    },
  });
}

export async function getKitForEmployeeDelivery(employeeId: string, type: "UNIFORM" | "PPE") {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { positionId: true },
  });

  if (!employee) throw new Error("Colaborador nao encontrado");

  const kitRevision = await prisma.kitRevision.findFirst({
    where: {
      positionId: employee.positionId,
      isActive: true,
    },
    include: {
      items: {
        include: {
          material: true,
        },
      },
    },
  });

  if (!kitRevision) return [];

  return kitRevision.items
    .filter((item) => item.material.category === type)
    .map((item) => ({
      materialId: item.materialId,
      materialName: item.material.name,
      materialSize: item.material.size,
      quantity: item.quantity,
      caNumber: item.material.caNumber,
    }));
}

export async function getEmployeePpeHistory(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { position: true },
  });

  if (!employee) throw new Error("Colaborador nao encontrado");

  const assignments = await prisma.assignment.findMany({
    where: {
      employeeId,
      type: "PPE",
    },
    include: {
      material: true,
      deliveryItem: {
        include: {
          delivery: {
            include: { user: true },
          },
        },
      },
    },
    orderBy: { issuedAt: "desc" },
  });

  const documents = await prisma.document.findMany({
    where: { employeeId, type: "PPE" },
    orderBy: { version: "desc" },
  });

  return { employee, assignments, documents };
}
