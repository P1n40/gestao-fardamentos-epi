import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { InsufficientStockError } from "@/lib/inventory-errors";
import prisma from "@/lib/prisma";
import { MaterialSchema, StockMovementSchema } from "@/types/schemas";

const PLANNING_HISTORY_WINDOW_DAYS = 180;

export function calculateStockBalanceTransition(params: {
  balanceBefore: number;
  quantity: number;
  materialName: string;
}) {
  const { balanceBefore, quantity, materialName } = params;
  const balanceAfter = balanceBefore + quantity;

  if (balanceAfter < 0) {
    throw new InsufficientStockError(materialName, balanceBefore, Math.abs(quantity));
  }

  return {
    balanceBefore,
    balanceAfter,
  };
}

export function getPlanningItemStatus(params: {
  stock: number;
  minStock: number;
  missingInField: number;
}) {
  const { stock, minStock, missingInField } = params;

  if (stock < minStock) {
    return "CRITICAL" as const;
  }

  if (missingInField > 0) {
    return "WARNING" as const;
  }

  return "OK" as const;
}

export interface HistoricalConsumptionEntry {
  quantity: number;
  issuedAt: Date;
}

export interface HistoricalConsumptionSummary {
  totalConsumed: number;
  consumedLast30Days: number;
  consumedLast90Days: number;
  averageMonthlyConsumption: number;
  recommendedMonthlyBuffer: number;
  stockCoverageMonths: number | null;
  lastConsumedAt: Date | null;
}

export interface PurchaseSuggestionBreakdown {
  fieldGap: number;
  stockAvailableForRegularization: number;
  activeBasePurchaseNeed: number;
  remainingStockAfterRegularization: number;
  minimumBufferPurchaseNeed: number;
  totalSuggested: number;
}

type MaterialSizingDimension = "shirt" | "pants" | "shoe" | "generic";

interface ProjectionEmployeeSizing {
  positionId: string;
  createdAt: Date;
  shirtSize: string | null;
  pantsSize: string | null;
  shoeSize: string | null;
}

interface WeightedProjectionEmployeeSizing extends ProjectionEmployeeSizing {
  requiredQuantity: number;
}

export interface MaterialProjectionSignals {
  recentAdmissionsDemand: number;
  potentialReturnsFromInactive: number;
  missingSizingData: number;
}

export type RuptureRiskLevel = "HIGH" | "MEDIUM" | "LOW";

export interface PlanningReportItem {
  id: string;
  name: string;
  category: "UNIFORM" | "PPE";
  unit: string;
  size: string | null;
  stock: number;
  minStock: number;
  totalRequired: number;
  currentAssignments: number;
  missingInField: number;
  replenishmentNeed: number;
  purchaseSuggestion: PurchaseSuggestionBreakdown;
  totalSuggested: number;
  historicalConsumption: HistoricalConsumptionSummary;
  projectionSignals: MaterialProjectionSignals;
  status: "CRITICAL" | "WARNING" | "OK";
}

export interface PrioritizedReplenishmentItem {
  id: string;
  name: string;
  category: "UNIFORM" | "PPE";
  size: string | null;
  totalSuggested: number;
  riskScore: number;
  riskLevel: RuptureRiskLevel;
  reasons: string[];
  stockCoverageMonths: number | null;
  activeBasePurchaseNeed: number;
  minimumBufferPurchaseNeed: number;
  recentAdmissionsDemand: number;
  missingSizingData: number;
  potentialReturnsFromInactive: number;
  status: "CRITICAL" | "WARNING" | "OK";
}

export interface PrioritizedReplenishmentReport {
  summary: {
    highRiskItems: number;
    mediumRiskItems: number;
    lowRiskItems: number;
    suggestedUnits: number;
    immediateUnits: number;
  };
  items: PrioritizedReplenishmentItem[];
}

function subtractDays(referenceDate: Date, days: number) {
  const nextDate = new Date(referenceDate);
  nextDate.setDate(nextDate.getDate() - days);
  return nextDate;
}

export function buildHistoricalConsumptionSummary(params: {
  entries: HistoricalConsumptionEntry[];
  currentStock: number;
  referenceDate?: Date;
}) {
  const referenceDate = params.referenceDate ?? new Date();
  const last30DaysStart = subtractDays(referenceDate, 30);
  const last90DaysStart = subtractDays(referenceDate, 90);

  const summary = params.entries.reduce<HistoricalConsumptionSummary>(
    (accumulator, entry) => {
      accumulator.totalConsumed += entry.quantity;

      if (entry.issuedAt >= last30DaysStart) {
        accumulator.consumedLast30Days += entry.quantity;
      }

      if (entry.issuedAt >= last90DaysStart) {
        accumulator.consumedLast90Days += entry.quantity;
      }

      if (!accumulator.lastConsumedAt || entry.issuedAt > accumulator.lastConsumedAt) {
        accumulator.lastConsumedAt = entry.issuedAt;
      }

      return accumulator;
    },
    {
      totalConsumed: 0,
      consumedLast30Days: 0,
      consumedLast90Days: 0,
      averageMonthlyConsumption: 0,
      recommendedMonthlyBuffer: 0,
      stockCoverageMonths: null,
      lastConsumedAt: null,
    },
  );

  const averageMonthlyConsumption =
    summary.consumedLast90Days > 0 ? Number((summary.consumedLast90Days / 3).toFixed(1)) : 0;
  const recommendedMonthlyBuffer = Math.ceil(averageMonthlyConsumption);
  const stockCoverageMonths =
    averageMonthlyConsumption > 0
      ? Number((params.currentStock / averageMonthlyConsumption).toFixed(1))
      : null;

  return {
    ...summary,
    averageMonthlyConsumption,
    recommendedMonthlyBuffer,
    stockCoverageMonths,
  };
}

export function normalizeSizeValue(value: string | null | undefined) {
  return value ? value.trim().toUpperCase() : null;
}

export function inferMaterialSizingDimension(material: {
  name: string;
  description?: string | null;
}) {
  const haystack = `${material.name} ${material.description ?? ""}`.toLowerCase();

  if (
    haystack.includes("camisa") ||
    haystack.includes("camiseta") ||
    haystack.includes("jaleco") ||
    haystack.includes("blusa") ||
    haystack.includes("polo")
  ) {
    return "shirt" as const;
  }

  if (
    haystack.includes("calca") ||
    haystack.includes("calça") ||
    haystack.includes("bermuda") ||
    haystack.includes("short")
  ) {
    return "pants" as const;
  }

  if (
    haystack.includes("bota") ||
    haystack.includes("sapato") ||
    haystack.includes("calcado") ||
    haystack.includes("calçado") ||
    haystack.includes("coturno")
  ) {
    return "shoe" as const;
  }

  return "generic" as const;
}

export function matchMaterialVariantToEmployee(params: {
  material: {
    name: string;
    description?: string | null;
    size?: string | null;
  };
  employee: {
    shirtSize?: string | null;
    pantsSize?: string | null;
    shoeSize?: string | null;
  };
}) {
  const materialSize = normalizeSizeValue(params.material.size);
  const dimension = inferMaterialSizingDimension(params.material);

  if (!materialSize || dimension === "generic") {
    return {
      matches: true,
      missingSizing: false,
      dimension,
    };
  }

  const employeeSize =
    dimension === "shirt"
      ? normalizeSizeValue(params.employee.shirtSize)
      : dimension === "pants"
        ? normalizeSizeValue(params.employee.pantsSize)
        : normalizeSizeValue(params.employee.shoeSize);

  if (!employeeSize) {
    return {
      matches: false,
      missingSizing: true,
      dimension,
    };
  }

  return {
    matches: employeeSize === materialSize,
    missingSizing: false,
    dimension,
  };
}

export function calculatePurchaseSuggestionBreakdown(params: {
  totalRequired: number;
  currentAssignments: number;
  stock: number;
  minStock: number;
}) {
  const fieldGap = Math.max(0, params.totalRequired - params.currentAssignments);
  const stockAvailableForRegularization = Math.min(params.stock, fieldGap);
  const activeBasePurchaseNeed = Math.max(0, fieldGap - params.stock);
  const remainingStockAfterRegularization = Math.max(0, params.stock - fieldGap);
  const minimumBufferPurchaseNeed = Math.max(
    0,
    params.minStock - remainingStockAfterRegularization,
  );
  const totalSuggested = activeBasePurchaseNeed + minimumBufferPurchaseNeed;

  return {
    fieldGap,
    stockAvailableForRegularization,
    activeBasePurchaseNeed,
    remainingStockAfterRegularization,
    minimumBufferPurchaseNeed,
    totalSuggested,
  } satisfies PurchaseSuggestionBreakdown;
}

export function buildMaterialProjectionSignals(params: {
  material: {
    id: string;
    name: string;
    description?: string | null;
    size?: string | null;
  };
  requiredQuantityPerEmployee: number;
  activeEmployees: ProjectionEmployeeSizing[];
  inactiveAssignedQuantity: number;
  referenceDate?: Date;
}) {
  const referenceDate = params.referenceDate ?? new Date();
  const admissionWindowStart = subtractDays(referenceDate, 90);

  let recentAdmissionsDemand = 0;
  let missingSizingData = 0;

  for (const employee of params.activeEmployees) {
    const sizingMatch = matchMaterialVariantToEmployee({
      material: params.material,
      employee,
    });

    if (sizingMatch.missingSizing) {
      missingSizingData += params.requiredQuantityPerEmployee;
      continue;
    }

    if (sizingMatch.matches && employee.createdAt >= admissionWindowStart) {
      recentAdmissionsDemand += params.requiredQuantityPerEmployee;
    }
  }

  return {
    recentAdmissionsDemand,
    potentialReturnsFromInactive: params.inactiveAssignedQuantity,
    missingSizingData,
  } satisfies MaterialProjectionSignals;
}

export function calculateRuptureRisk(item: PlanningReportItem) {
  let riskScore = 0;
  const reasons: string[] = [];

  if (item.status === "CRITICAL") {
    riskScore += 50;
    reasons.push("Abaixo do estoque minimo");
  } else if (item.status === "WARNING") {
    riskScore += 20;
    reasons.push("Gap operacional em campo");
  }

  if (item.purchaseSuggestion.activeBasePurchaseNeed > 0) {
    riskScore += 25;
    reasons.push("Compra imediata para base ativa");
  }

  if (item.historicalConsumption.stockCoverageMonths !== null) {
    if (item.historicalConsumption.stockCoverageMonths < 1) {
      riskScore += 20;
      reasons.push("Cobertura menor que 1 mes");
    } else if (item.historicalConsumption.stockCoverageMonths < 2) {
      riskScore += 10;
      reasons.push("Cobertura menor que 2 meses");
    }
  }

  if (item.projectionSignals.recentAdmissionsDemand > 0) {
    riskScore += 10;
    reasons.push("Pressao de admissoes recentes");
  }

  if (item.projectionSignals.missingSizingData > 0) {
    riskScore += 5;
    reasons.push("Sizing pendente em variantes");
  }

  if (item.totalSuggested >= 10) {
    riskScore += 5;
  }

  const riskLevel: RuptureRiskLevel = riskScore >= 60 ? "HIGH" : riskScore >= 30 ? "MEDIUM" : "LOW";

  return {
    riskScore,
    riskLevel,
    reasons,
  };
}

function buildWeightedMaterialProjectionSignals(params: {
  material: {
    id: string;
    name: string;
    description?: string | null;
    size?: string | null;
  };
  activeEmployees: WeightedProjectionEmployeeSizing[];
  inactiveAssignedQuantity: number;
  referenceDate?: Date;
}) {
  const referenceDate = params.referenceDate ?? new Date();
  const admissionWindowStart = subtractDays(referenceDate, 90);

  let recentAdmissionsDemand = 0;
  let missingSizingData = 0;

  for (const employee of params.activeEmployees) {
    const sizingMatch = matchMaterialVariantToEmployee({
      material: params.material,
      employee,
    });

    if (sizingMatch.missingSizing) {
      missingSizingData += employee.requiredQuantity;
      continue;
    }

    if (sizingMatch.matches && employee.createdAt >= admissionWindowStart) {
      recentAdmissionsDemand += employee.requiredQuantity;
    }
  }

  return {
    recentAdmissionsDemand,
    potentialReturnsFromInactive: params.inactiveAssignedQuantity,
    missingSizingData,
  } satisfies MaterialProjectionSignals;
}

export function buildPrioritizedReplenishmentReport(report: PlanningReportItem[]) {
  const items = report
    .filter(
      (item) =>
        item.totalSuggested > 0 ||
        item.status !== "OK" ||
        item.projectionSignals.missingSizingData > 0,
    )
    .map((item) => {
      const risk = calculateRuptureRisk(item);

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        size: item.size,
        totalSuggested: item.totalSuggested,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
        reasons: risk.reasons,
        stockCoverageMonths: item.historicalConsumption.stockCoverageMonths,
        activeBasePurchaseNeed: item.purchaseSuggestion.activeBasePurchaseNeed,
        minimumBufferPurchaseNeed: item.purchaseSuggestion.minimumBufferPurchaseNeed,
        recentAdmissionsDemand: item.projectionSignals.recentAdmissionsDemand,
        missingSizingData: item.projectionSignals.missingSizingData,
        potentialReturnsFromInactive: item.projectionSignals.potentialReturnsFromInactive,
        status: item.status,
      } satisfies PrioritizedReplenishmentItem;
    })
    .sort((left, right) => {
      if (left.riskScore !== right.riskScore) {
        return right.riskScore - left.riskScore;
      }

      if (left.totalSuggested !== right.totalSuggested) {
        return right.totalSuggested - left.totalSuggested;
      }

      return left.name.localeCompare(right.name);
    });

  return {
    summary: {
      highRiskItems: items.filter((item) => item.riskLevel === "HIGH").length,
      mediumRiskItems: items.filter((item) => item.riskLevel === "MEDIUM").length,
      lowRiskItems: items.filter((item) => item.riskLevel === "LOW").length,
      suggestedUnits: items.reduce((total, item) => total + item.totalSuggested, 0),
      immediateUnits: items.reduce((total, item) => total + item.activeBasePurchaseNeed, 0),
    },
    items,
  } satisfies PrioritizedReplenishmentReport;
}

interface PlanningReportFilters {
  department?: string;
  positionId?: string;
}

export async function getMaterials(onlyActive = false) {
  return await prisma.material.findMany({
    where: onlyActive ? { active: true } : undefined,
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      unit: true,
      size: true,
      sku: true,
      caNumber: true,
      stock: true,
      minStock: true,
      active: true,
      createdAt: true,
    },
    orderBy: [{ name: "asc" }, { size: "asc" }, { sku: "asc" }],
  });
}

export async function createMaterial(data: z.infer<typeof MaterialSchema>) {
  return await prisma.material.create({
    data,
  });
}

export async function updateMaterial(id: string, data: Partial<z.infer<typeof MaterialSchema>>) {
  return await prisma.material.update({
    where: { id },
    data,
  });
}

export async function toggleMaterialStatus(id: string) {
  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) throw new Error("Material não encontrado");

  return await prisma.material.update({
    where: { id },
    data: { active: !material.active },
  });
}

export async function getMaterialBySku(sku: string) {
  return await prisma.material.findUnique({
    where: { sku },
  });
}

export async function getMaterialStats() {
  const stats = await prisma.material.groupBy({
    by: ["category"],
    _sum: { stock: true },
    _count: true,
  });
  return stats;
}

/**
 * Records a stock movement (Ledger entry) and updates material balance.
 */
export async function recordStockMovement(
  data: z.infer<typeof StockMovementSchema>,
  userId?: string,
) {
  return await prisma.$transaction(async (tx) => {
    const material = await tx.material.findUnique({
      where: { id: data.materialId },
    });

    if (!material) throw new Error("Material não encontrado");

    const { balanceBefore, balanceAfter } = calculateStockBalanceTransition({
      balanceBefore: material.stock,
      quantity: data.quantity,
      materialName: material.name,
    });

    // 1. Create Ledger entry
    const transaction = await tx.stockTransaction.create({
      data: {
        materialId: data.materialId,
        type: data.type,
        quantity: data.quantity,
        balanceBefore,
        balanceAfter,
        reason: data.reason,
        notes: data.notes,
        userId,
      },
    });

    // 2. Update Material current balance
    await tx.material.update({
      where: { id: data.materialId },
      data: { stock: balanceAfter },
    });

    // 3. Log to Audit (Traceability T06)
    await logAudit({
      userId,
      action: "STOCK_MOVEMENT",
      entity: "Material",
      entityId: data.materialId,
      details: `${data.type}: ${data.quantity} un (${data.reason})`,
      oldValue: { stock: balanceBefore },
      newValue: { stock: balanceAfter },
      metadata: { transactionId: transaction.id },
    });

    return transaction;
  });
}

/**
 * Retrieves transaction history for a material or all materials.
 */
export async function getStockHistory(materialId?: string, limit = 50) {
  return await prisma.stockTransaction.findMany({
    where: materialId ? { materialId } : undefined,
    select: {
      id: true,
      type: true,
      quantity: true,
      balanceBefore: true,
      balanceAfter: true,
      reason: true,
      notes: true,
      createdAt: true,
      material: {
        select: {
          name: true,
          unit: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Calculates a purchase planning report based on current stock,
 * minimum stock, and forecasted needs (employees without active kits).
 * Cache is intentionally avoided here: stock and assignments are operationally mutable,
 * and this service is reused by pages with permission-based access.
 */
export async function getPlanningReport(filters: PlanningReportFilters = {}) {
  const referenceDate = new Date();
  const historicalConsumptionStart = subtractDays(referenceDate, PLANNING_HISTORY_WINDOW_DAYS);
  const activeEmployeeScope =
    filters.department || filters.positionId
      ? {
          active: true,
          ...(filters.department ? { department: filters.department } : {}),
          ...(filters.positionId ? { positionId: filters.positionId } : {}),
        }
      : { active: true };
  const inactiveEmployeeScope =
    filters.department || filters.positionId
      ? {
          active: false,
          ...(filters.department ? { department: filters.department } : {}),
          ...(filters.positionId ? { positionId: filters.positionId } : {}),
        }
      : { active: false };

  const [materials, activeEmployees, activeAssignments, inactiveAssignments, historicalDeliveries] =
    await Promise.all([
      prisma.material.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          unit: true,
          size: true,
          stock: true,
          minStock: true,
          kitItems: {
            where: {
              revision: {
                isActive: true,
                ...(filters.positionId ? { positionId: filters.positionId } : {}),
              },
            },
            select: {
              quantity: true,
              revision: {
                select: {
                  position: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ name: "asc" }, { size: "asc" }],
      }),
      prisma.employee.findMany({
        where: activeEmployeeScope,
        select: {
          id: true,
          positionId: true,
          createdAt: true,
          shirtSize: true,
          pantsSize: true,
          shoeSize: true,
        },
      }),
      prisma.assignment.groupBy({
        by: ["materialId"],
        where: {
          status: "ISSUED",
          employee: activeEmployeeScope,
        },
        _sum: {
          quantity: true,
        },
      }),
      prisma.assignment.groupBy({
        by: ["materialId"],
        where: {
          status: "ISSUED",
          employee: inactiveEmployeeScope,
        },
        _sum: {
          quantity: true,
        },
      }),
      prisma.deliveryItem.findMany({
        where: {
          delivery: {
            // Planejamento operacional usa janela recente; documentos, auditoria e histórico jurídico
            // continuam consultando suas próprias fontes completas.
            issuedAt: {
              gte: historicalConsumptionStart,
            },
            employee: activeEmployeeScope,
          },
        },
        select: {
          materialId: true,
          quantity: true,
          delivery: {
            select: {
              issuedAt: true,
            },
          },
        },
      }),
    ]);

  const activeEmployeesByPositionId = activeEmployees.reduce<Map<string, typeof activeEmployees>>(
    (accumulator, employee) => {
      const employeesInPosition = accumulator.get(employee.positionId) ?? [];
      employeesInPosition.push(employee);
      accumulator.set(employee.positionId, employeesInPosition);
      return accumulator;
    },
    new Map(),
  );

  const activeAssignmentTotalsByMaterialId = new Map(
    activeAssignments.map((assignment) => [assignment.materialId, assignment._sum.quantity ?? 0]),
  );
  const inactiveAssignmentTotalsByMaterialId = new Map(
    inactiveAssignments.map((assignment) => [assignment.materialId, assignment._sum.quantity ?? 0]),
  );

  const historicalConsumptionByMaterialId = historicalDeliveries.reduce<
    Map<string, HistoricalConsumptionEntry[]>
  >((accumulator, item) => {
    const entries = accumulator.get(item.materialId) ?? [];
    entries.push({
      quantity: item.quantity,
      issuedAt: item.delivery.issuedAt,
    });
    accumulator.set(item.materialId, entries);
    return accumulator;
  }, new Map());

  const report: PlanningReportItem[] = materials.map((m) => {
    let totalRequired = 0;
    const activeEmployeesForMaterial: WeightedProjectionEmployeeSizing[] = [];

    for (const kitItem of m.kitItems) {
      const employeesInPosition =
        activeEmployeesByPositionId.get(kitItem.revision.position.id) ?? [];

      for (const employee of employeesInPosition) {
        const sizingMatch = matchMaterialVariantToEmployee({
          material: m,
          employee,
        });

        if (sizingMatch.matches) {
          totalRequired += kitItem.quantity;
        }

        activeEmployeesForMaterial.push({
          ...employee,
          requiredQuantity: kitItem.quantity,
        });
      }
    }

    const currentAssignments = activeAssignmentTotalsByMaterialId.get(m.id) ?? 0;
    const missingInField = Math.max(0, totalRequired - currentAssignments);
    const purchaseSuggestion = calculatePurchaseSuggestionBreakdown({
      totalRequired,
      currentAssignments,
      stock: m.stock,
      minStock: m.minStock,
    });
    const replenishmentNeed = purchaseSuggestion.minimumBufferPurchaseNeed;
    const totalSuggested = purchaseSuggestion.totalSuggested;
    const historicalConsumption = buildHistoricalConsumptionSummary({
      entries: historicalConsumptionByMaterialId.get(m.id) ?? [],
      currentStock: m.stock,
      referenceDate,
    });
    const projectionSignals = buildWeightedMaterialProjectionSignals({
      material: m,
      activeEmployees: activeEmployeesForMaterial,
      inactiveAssignedQuantity: inactiveAssignmentTotalsByMaterialId.get(m.id) ?? 0,
      referenceDate,
    });

    return {
      id: m.id,
      name: m.name,
      category: m.category,
      unit: m.unit,
      size: m.size,
      stock: m.stock,
      minStock: m.minStock,
      totalRequired,
      currentAssignments,
      missingInField,
      replenishmentNeed,
      purchaseSuggestion,
      totalSuggested,
      historicalConsumption,
      projectionSignals,
      status: getPlanningItemStatus({
        stock: m.stock,
        minStock: m.minStock,
        missingInField,
      }),
    };
  });

  return report;
}
