import { z } from "zod";

import prisma from "@/lib/prisma";
import { KitTemplateItemSchema, KitTemplateLinkSchema, KitTemplateSchema } from "@/types/schemas";

import { checkKitRevisionConflicts } from "./services";

export type KitTemplateData = z.infer<typeof KitTemplateSchema>;
export type KitTemplateItemData = z.infer<typeof KitTemplateItemSchema>;
export type KitTemplateLinkData = z.infer<typeof KitTemplateLinkSchema>;

export async function getKitTemplates() {
  return await prisma.kitTemplate.findMany({
    include: {
      _count: {
        select: {
          items: true,
          links: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getActiveKitTemplates() {
  return await prisma.kitTemplate.findMany({
    where: { active: true },
    include: {
      items: {
        include: { material: true },
        orderBy: { material: { name: "asc" } },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getKitTemplateById(id: string) {
  return await prisma.kitTemplate.findUnique({
    where: { id },
    include: {
      items: {
        include: { material: true },
        orderBy: { material: { name: "asc" } },
      },
      links: {
        include: {
          position: true,
          lastRevision: true,
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
}

export async function createKitTemplate(data: KitTemplateData) {
  return await prisma.kitTemplate.create({
    data,
  });
}

export async function updateKitTemplate(id: string, data: Partial<KitTemplateData>) {
  return await prisma.kitTemplate.update({
    where: { id },
    data,
  });
}

export async function toggleKitTemplateStatus(id: string) {
  const template = await prisma.kitTemplate.findUnique({ where: { id } });
  if (!template) {
    throw new Error("Modelo de kit nao encontrado.");
  }

  return await prisma.kitTemplate.update({
    where: { id },
    data: { active: !template.active },
  });
}

export async function upsertKitTemplateItem(data: KitTemplateItemData) {
  const [template, material] = await Promise.all([
    prisma.kitTemplate.findUnique({ where: { id: data.templateId } }),
    prisma.material.findUnique({ where: { id: data.materialId } }),
  ]);

  if (!template) {
    throw new Error("Modelo de kit nao encontrado.");
  }

  if (!material) {
    throw new Error("Material nao encontrado.");
  }

  if (!material.active) {
    throw new Error("Material inativo nao pode ser incluido em modelos de kit.");
  }

  return await prisma.kitTemplateItem.upsert({
    where: {
      templateId_materialId: {
        templateId: data.templateId,
        materialId: data.materialId,
      },
    },
    update: {
      quantity: data.quantity,
      periodDays: data.periodDays,
      mandatory: data.mandatory,
    },
    create: data,
  });
}

export async function deleteKitTemplateItem(id: string) {
  return await prisma.kitTemplateItem.delete({
    where: { id },
  });
}

export async function linkKitTemplateToPosition(data: KitTemplateLinkData) {
  return await prisma.$transaction(async (tx) => {
    const template = await tx.kitTemplate.findUnique({
      where: { id: data.templateId },
      include: {
        items: {
          include: { material: true },
        },
      },
    });

    if (!template) {
      throw new Error("Modelo de kit nao encontrado.");
    }

    if (!template.active) {
      throw new Error("Modelo de kit inativo nao pode ser vinculado.");
    }

    if (template.items.length === 0) {
      throw new Error("Adicione pelo menos um material ao modelo antes de vincular.");
    }

    const position = await tx.position.findUnique({
      where: { id: data.positionId },
    });

    if (!position) {
      throw new Error("Cargo nao encontrado.");
    }

    const invalidUniform = template.items.find(
      (item) => item.material.category === "UNIFORM" && !position.requiresUniform,
    );
    if (invalidUniform) {
      throw new Error(`O cargo "${position.name}" nao aceita itens de fardamento.`);
    }

    const invalidPpe = template.items.find(
      (item) => item.material.category === "PPE" && !position.requiresPPE,
    );
    if (invalidPpe) {
      throw new Error(`O cargo "${position.name}" nao aceita itens de EPI.`);
    }

    const validFrom = new Date();
    const conflicts = await checkKitRevisionConflicts(data.positionId, validFrom);
    const archivedConflicts = conflicts.filter((conflict) => !conflict.isActive);
    if (archivedConflicts.length > 0) {
      throw new Error(
        `Conflito de vigencia com a versao ${archivedConflicts[0].version} do cargo ${position.name}.`,
      );
    }

    const lastRevision = await tx.kitRevision.findFirst({
      where: { positionId: data.positionId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const revision = await tx.kitRevision.create({
      data: {
        positionId: data.positionId,
        sourceTemplateId: data.templateId,
        version: (lastRevision?.version ?? 0) + 1,
        notes: `Rascunho gerado a partir do modelo: ${template.name}`,
        validFrom,
        isActive: false,
        items: {
          create: template.items.map((item) => ({
            materialId: item.materialId,
            quantity: item.quantity,
            periodDays: item.periodDays,
            mandatory: item.mandatory,
          })),
        },
      },
    });

    const link = await tx.kitTemplatePositionLink.upsert({
      where: {
        templateId_positionId: {
          templateId: data.templateId,
          positionId: data.positionId,
        },
      },
      update: {
        lastRevisionId: revision.id,
      },
      create: {
        templateId: data.templateId,
        positionId: data.positionId,
        lastRevisionId: revision.id,
      },
    });

    return { revision, link, template, position };
  });
}
