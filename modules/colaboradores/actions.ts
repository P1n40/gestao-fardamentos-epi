"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { normalizeName, normalizeNumeric } from "@/lib/utils";
import { EmployeeSchema } from "@/types/schemas";

import { checkUniqueness } from "./services";

/**
 * Creates a new employee.
 * Requires MANAGE_EMPLOYEES permission.
 */
export async function createEmployee(formData: FormData) {
  const session = await requirePermission("MANAGE_EMPLOYEES", true);
  const userId = session.user.id;

  const rawData = {
    name: normalizeName(formData.get("name") as string),
    documentId: normalizeNumeric(formData.get("documentId") as string),
    registrationCode: normalizeNumeric(formData.get("registrationCode") as string) || null,
    department: formData.get("department") || null,
    positionId: formData.get("positionId"),
    shirtSize: formData.get("shirtSize") || null,
    pantsSize: formData.get("pantsSize") || null,
    shoeSize: formData.get("shoeSize") || null,
  };

  const validatedData = EmployeeSchema.safeParse(rawData);

  if (!validatedData.success) {
    return { error: validatedData.error.flatten().fieldErrors };
  }

  // Explicit Uniqueness Check
  const conflict = await checkUniqueness({
    documentId: validatedData.data.documentId,
    registrationCode: validatedData.data.registrationCode,
  });

  if (conflict) {
    return { error: conflict };
  }

  try {
    const employee = await prisma.employee.create({
      data: validatedData.data,
      include: { position: true },
    });

    await logAudit({
      userId,
      action: "CREATE",
      entity: "Employee",
      entityId: employee.id,
      newValue: employee,
    });

    revalidatePath("/colaboradores");
    return { success: true };
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2002") {
      return { error: "CPF ou Matrícula já cadastrados" };
    }
    return { error: "Erro interno ao criar colaborador" };
  }
}

/**
 * Updates an existing employee.
 */
export async function updateEmployee(id: string, formData: FormData) {
  const session = await requirePermission("MANAGE_EMPLOYEES", true);
  const userId = session.user.id;

  const oldEmployee = await prisma.employee.findUnique({ where: { id } });
  if (!oldEmployee) throw new Error("Colaborador não encontrado");

  const rawData = {
    name: normalizeName(formData.get("name") as string),
    documentId: normalizeNumeric(formData.get("documentId") as string),
    registrationCode: normalizeNumeric(formData.get("registrationCode") as string) || null,
    department: formData.get("department") || null,
    positionId: formData.get("positionId"),
    shirtSize: formData.get("shirtSize") || null,
    pantsSize: formData.get("pantsSize") || null,
    shoeSize: formData.get("shoeSize") || null,
  };

  const validatedData = EmployeeSchema.safeParse(rawData);

  if (!validatedData.success) {
    return { error: validatedData.error.flatten().fieldErrors };
  }

  // Explicit Uniqueness Check
  const conflict = await checkUniqueness({
    documentId: validatedData.data.documentId,
    registrationCode: validatedData.data.registrationCode,
    excludeId: id,
  });

  if (conflict) {
    return { error: conflict };
  }

  try {
    const employee = await prisma.employee.update({
      where: { id },
      data: validatedData.data,
      include: { position: true },
    });

    await logAudit({
      userId,
      action: "UPDATE",
      entity: "Employee",
      entityId: id,
      oldValue: oldEmployee,
      newValue: employee,
    });

    revalidatePath("/colaboradores");
    return { success: true };
  } catch (err: any) {
    console.error(err);
    return { error: "Erro interno ao atualizar colaborador" };
  }
}

/**
 * Toggles an employee's active status.
 */
export async function toggleEmployeeStatus(id: string) {
  const session = await requirePermission("MANAGE_EMPLOYEES", true);
  const userId = session.user.id;

  const oldEmployee = await prisma.employee.findUnique({ where: { id } });
  if (!oldEmployee) throw new Error("Colaborador não encontrado");

  try {
    const employee = await prisma.employee.update({
      where: { id },
      data: { active: !oldEmployee.active },
    });

    await logAudit({
      userId,
      action: "UPDATE",
      entity: "Employee",
      entityId: id,
      oldValue: { active: oldEmployee.active },
      newValue: { active: employee.active },
    });

    revalidatePath("/colaboradores");
    return { success: true };
  } catch (err: any) {
    console.error(err);
    return { error: "Erro interno ao alterar status" };
  }
}
