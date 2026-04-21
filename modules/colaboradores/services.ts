import { z } from "zod";

import prisma from "@/lib/prisma";
import { EmployeeSchema } from "@/types/schemas";

export async function getEmployees(params: {
  search?: string;
  positionId?: string;
  department?: string;
  status?: "active" | "inactive" | "all";
  page?: number;
  pageSize?: number;
}) {
  const { search, positionId, department, status, page = 1, pageSize = 10 } = params;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { documentId: { contains: search } },
      { registrationCode: { contains: search } },
    ];
  }

  if (positionId && positionId !== "all") {
    where.positionId = positionId;
  }

  if (department && department !== "all") {
    where.department = { contains: department, mode: "insensitive" };
  }

  if (status === "active") {
    where.active = true;
  } else if (status === "inactive") {
    where.active = false;
  }

  const [total, items] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      select: {
        id: true,
        name: true,
        documentId: true,
        registrationCode: true,
        department: true,
        positionId: true,
        active: true,
        shirtSize: true,
        pantsSize: true,
        shoeSize: true,
        position: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function toggleEmployeeStatus(id: string) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw new Error("Colaborador nao encontrado");

  return await prisma.employee.update({
    where: { id },
    data: { active: !employee.active },
  });
}

export async function getEmployeeById(id: string) {
  return await prisma.employee.findUnique({
    where: { id },
    include: {
      position: true,
      assignments: {
        include: { material: true },
        orderBy: { issuedAt: "desc" },
      },
    },
  });
}

interface EmployeeProfileEmployee {
  id: string;
  name: string;
  documentId: string;
  registrationCode: string | null;
  department: string | null;
  active: boolean;
  createdAt: Date;
  shirtSize: string | null;
  pantsSize: string | null;
  shoeSize: string | null;
  positionId: string;
  position: {
    name: string;
  };
}

type EmployeeProfileDelivery = Awaited<
  ReturnType<
    typeof prisma.delivery.findMany<{
      include: {
        document: true;
        items: { include: { material: true } };
        user: { select: { name: true } };
      };
    }>
  >
>[number];

type EmployeeProfileDocument = Awaited<ReturnType<typeof prisma.document.findMany>>[number];

type EmployeeActiveAssignment = Awaited<
  ReturnType<
    typeof prisma.assignment.findMany<{
      include: {
        material: true;
        deliveryItem: { select: { deliveryId: true } };
      };
    }>
  >
>[number];

type EmployeeActiveKit = Awaited<
  ReturnType<
    typeof prisma.kitRevision.findFirst<{
      include: {
        items: { include: { material: true } };
      };
    }>
  >
>;

interface EmployeeDetailSnapshot {
  employee: EmployeeProfileEmployee;
  deliveries: EmployeeProfileDelivery[];
  documents: EmployeeProfileDocument[];
  activeAssignments: EmployeeActiveAssignment[];
  activeKit: EmployeeActiveKit;
}

async function getEmployeeDetailSnapshot(id: string): Promise<EmployeeDetailSnapshot | null> {
  const employee = await prisma.employee.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      documentId: true,
      registrationCode: true,
      department: true,
      active: true,
      createdAt: true,
      shirtSize: true,
      pantsSize: true,
      shoeSize: true,
      positionId: true,
      position: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!employee) {
    return null;
  }

  const [deliveries, documents, activeAssignments, activeKit] = await Promise.all([
    prisma.delivery.findMany({
      where: { employeeId: id },
      include: {
        document: true,
        items: {
          include: { material: true },
        },
        user: {
          select: { name: true },
        },
      },
      orderBy: { issuedAt: "desc" },
    }),

    prisma.document.findMany({
      where: { employeeId: id },
      orderBy: { issuedAt: "desc" },
    }),

    prisma.assignment.findMany({
      where: {
        employeeId: id,
        status: "ISSUED",
      },
      include: {
        material: true,
        deliveryItem: {
          select: {
            deliveryId: true,
          },
        },
      },
      orderBy: { issuedAt: "desc" },
    }),

    prisma.kitRevision.findFirst({
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
    }),
  ]);

  return {
    employee,
    deliveries,
    documents,
    activeAssignments,
    activeKit,
  };
}

export async function getEmployeeProfile(id: string) {
  const snapshot = await getEmployeeDetailSnapshot(id);

  if (!snapshot) {
    return null;
  }

  return {
    employee: snapshot.employee,
    deliveries: snapshot.deliveries,
    documents: snapshot.documents,
    activeAssignments: snapshot.activeAssignments,
  };
}

export interface KitComplianceItem {
  materialId: string;
  materialName: string;
  category: "UNIFORM" | "PPE";
  requiredQuantity: number;
  deliveredQuantity: number;
  unit: string;
  status: "OK" | "PENDING" | "EXPIRED" | "WARNING";
  lastIssuedAt: Date | null;
  nextReplenishmentAt: Date | null;
  daysToReplenish: number | null;
}

function buildEmployeeKitCompliance(snapshot: EmployeeDetailSnapshot) {
  const { activeAssignments, activeKit } = snapshot;

  if (!activeKit) {
    return {
      items: [],
      extras: activeAssignments.map((assignment) => ({
        materialName: assignment.material.name,
        quantity: assignment.quantity,
        issuedAt: assignment.issuedAt,
        category: assignment.type as "UNIFORM" | "PPE",
      })),
    };
  }

  const now = new Date();
  const nearExpiryDate = new Date(now);
  nearExpiryDate.setDate(nearExpiryDate.getDate() + 30);

  const assignmentsByMaterialId = new Map<string, EmployeeActiveAssignment[]>();
  for (const assignment of activeAssignments) {
    const currentAssignments = assignmentsByMaterialId.get(assignment.materialId) ?? [];
    currentAssignments.push(assignment);
    assignmentsByMaterialId.set(assignment.materialId, currentAssignments);
  }

  const processedMaterialIds = new Set<string>();
  const compliance: KitComplianceItem[] = activeKit.items.map((kitItem: any) => {
    processedMaterialIds.add(kitItem.materialId);

    const itemAssignments = assignmentsByMaterialId.get(kitItem.materialId) ?? [];
    const validAssignments = itemAssignments.filter(
      (assignment) => !assignment.expiresAt || assignment.expiresAt > now,
    );
    const validQuantity = validAssignments.reduce(
      (total, assignment) => total + assignment.quantity,
      0,
    );
    const lastIssuedAt =
      itemAssignments.length > 0
        ? new Date(Math.max(...itemAssignments.map((assignment) => assignment.issuedAt.getTime())))
        : null;

    const assignmentsWithExpiry = validAssignments.filter(
      (assignment): assignment is EmployeeActiveAssignment & { expiresAt: Date } =>
        assignment.expiresAt instanceof Date,
    );

    const nextReplenishmentAt =
      assignmentsWithExpiry.length > 0
        ? new Date(
            Math.min(...assignmentsWithExpiry.map((assignment) => assignment.expiresAt.getTime())),
          )
        : null;

    let status: KitComplianceItem["status"] = "OK";

    if (validQuantity < kitItem.quantity) {
      status = "PENDING";
    } else if (nextReplenishmentAt && nextReplenishmentAt < now) {
      status = "EXPIRED";
    } else if (nextReplenishmentAt && nextReplenishmentAt < nearExpiryDate) {
      status = "WARNING";
    }

    return {
      materialId: kitItem.materialId,
      materialName: kitItem.material.name,
      category: kitItem.material.category,
      requiredQuantity: kitItem.quantity,
      deliveredQuantity: validQuantity,
      unit: kitItem.material.unit,
      status,
      lastIssuedAt,
      nextReplenishmentAt,
      daysToReplenish: nextReplenishmentAt
        ? Math.ceil((nextReplenishmentAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    };
  });

  const extras = activeAssignments
    .filter((assignment) => !processedMaterialIds.has(assignment.materialId))
    .map((assignment) => ({
      materialName: assignment.material.name,
      quantity: assignment.quantity,
      issuedAt: assignment.issuedAt,
      category: assignment.type as "UNIFORM" | "PPE",
    }));

  return { items: compliance, extras };
}

export async function getEmployeeKitCompliance(id: string) {
  const snapshot = await getEmployeeDetailSnapshot(id);

  if (!snapshot) throw new Error("Colaborador nao encontrado");

  return buildEmployeeKitCompliance(snapshot);
}

export async function getEmployeeProfileWithCompliance(id: string) {
  const snapshot = await getEmployeeDetailSnapshot(id);

  if (!snapshot) {
    return null;
  }

  return {
    employee: snapshot.employee,
    deliveries: snapshot.deliveries,
    documents: snapshot.documents,
    activeAssignments: snapshot.activeAssignments,
    compliance: buildEmployeeKitCompliance(snapshot),
  };
}

export async function createEmployee(data: z.infer<typeof EmployeeSchema>) {
  return await prisma.employee.create({
    data,
  });
}

export async function updateEmployee(id: string, data: Partial<z.infer<typeof EmployeeSchema>>) {
  return await prisma.employee.update({
    where: { id },
    data,
  });
}

export async function checkUniqueness(params: {
  documentId: string;
  registrationCode?: string | null;
  excludeId?: string;
}) {
  const { documentId, registrationCode, excludeId } = params;

  const conflicts = await prisma.employee.findMany({
    where: {
      OR: [{ documentId }, registrationCode ? { registrationCode } : {}].filter(
        (condition) => Object.keys(condition).length > 0,
      ),
      NOT: excludeId ? { id: excludeId } : undefined,
    },
    select: {
      documentId: true,
      registrationCode: true,
    },
  });

  if (conflicts.length === 0) return null;

  const hasCpfConflict = conflicts.some((conflict: any) => conflict.documentId === documentId);
  const hasRegistrationConflict = registrationCode
    ? conflicts.some((conflict: any) => conflict.registrationCode === registrationCode)
    : false;

  if (hasCpfConflict) return "CPF ja cadastrado para outro colaborador";
  if (hasRegistrationConflict) return "Matricula ja cadastrada para outro colaborador";

  return null;
}
