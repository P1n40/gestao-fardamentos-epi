import { z } from "zod";

import prisma from "@/lib/prisma";
import { PositionSchema } from "@/types/schemas";

export async function getPositions(onlyActive = false) {
  return await prisma.position.findMany({
    where: onlyActive ? { active: true } : undefined,
    orderBy: { name: "asc" },
  });
}

export async function getPositionById(id: string) {
  return await prisma.position.findUnique({
    where: { id },
  });
}

export async function createPosition(data: z.infer<typeof PositionSchema>) {
  return await prisma.position.create({
    data,
  });
}

export async function updatePosition(id: string, data: Partial<z.infer<typeof PositionSchema>>) {
  return await prisma.position.update({
    where: { id },
    data,
  });
}

export async function togglePositionStatus(id: string) {
  const position = await prisma.position.findUnique({ where: { id } });
  if (!position) throw new Error("Cargo não encontrado");

  return await prisma.position.update({
    where: { id },
    data: { active: !position.active },
  });
}

export async function getPositionKits(id: string) {
  return await prisma.position.findUnique({
    where: { id },
    include: {
      kitRevisions: {
        where: { isActive: true },
        include: {
          items: {
            include: { material: true },
          },
        },
      },
    },
  });
}
