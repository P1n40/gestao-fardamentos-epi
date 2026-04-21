import prisma from "@/lib/prisma";
import { getPlanningReport } from "@/modules/estoque/services";
import {
  AggregatePendingReportItem,
  buildPendingEmployeeAnalytics,
  DashboardPeriod,
  resolveDashboardPeriodRange,
} from "@/modules/dashboard/utils";

export interface DashboardFilters {
  department?: string;
  positionId?: string;
  period: DashboardPeriod;
}

export interface DashboardFilterOption {
  value: string;
  label: string;
}

export interface DashboardFilterOptions {
  departments: DashboardFilterOption[];
  positions: DashboardFilterOption[];
  periods: Array<{
    value: DashboardPeriod;
    label: string;
  }>;
}

export interface DashboardMetric {
  label: string;
  value: number;
  description: string;
}

export interface DashboardCriticalMaterial {
  id: string;
  name: string;
  category: "UNIFORM" | "PPE";
  stock: number;
  minStock: number;
  missingInField: number;
  totalSuggested: number;
  status: "CRITICAL" | "WARNING" | "OK";
}

export interface DashboardPendingEmployee {
  employeeId: string;
  employeeName: string;
  positionName: string;
  department: string | null;
  pendingItems: number;
  warningItems: number;
  missingUniformItems: number;
  missingPpeItems: number;
}

export interface DashboardRecentDelivery {
  id: string;
  employeeId: string;
  issuedAt: Date;
  type: "UNIFORM" | "PPE";
  employeeName: string;
  itemCount: number;
  operatorName: string | null;
  documentVersion: number | null;
}

export interface DashboardData {
  filters: DashboardFilters;
  metrics: {
    activeEmployees: DashboardMetric;
    pendingEmployees: DashboardMetric;
    criticalStockItems: DashboardMetric;
    deliveriesThisMonth: DashboardMetric;
  };
  deliveryBreakdown: {
    total: number;
    uniform: number;
    ppe: number;
  };
  aggregateReports: {
    byDepartment: AggregatePendingReportItem[];
    byPosition: AggregatePendingReportItem[];
  };
  criticalMaterials: DashboardCriticalMaterial[];
  pendingEmployees: DashboardPendingEmployee[];
  recentDeliveries: DashboardRecentDelivery[];
  generatedAt: Date;
}

export async function getDashboardFilterOptions(): Promise<DashboardFilterOptions> {
  const [departments, positions] = await Promise.all([
    prisma.employee.findMany({
      where: {
        active: true,
        department: {
          not: null,
        },
      },
      distinct: ["department"],
      select: {
        department: true,
      },
      orderBy: {
        department: "asc",
      },
    }),
    prisma.position.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return {
    departments: departments
      .map((item: any) => item.department)
      .filter((department: string | null): department is string => Boolean(department))
      .map((department: string) => ({
        value: department,
        label: department,
      })),
    positions: positions.map((position: any) => ({
      value: position.id,
      label: position.name,
    })),
    periods: [
      { value: "current_month", label: "Mes atual" },
      { value: "last_30_days", label: "Ultimos 30 dias" },
      { value: "current_quarter", label: "Trimestre atual" },
      { value: "current_year", label: "Ano atual" },
      { value: "all_time", label: "Todo o historico" },
    ],
  };
}

export async function getDashboardData(filters: DashboardFilters): Promise<DashboardData> {
  const now = new Date();
  const periodRange = resolveDashboardPeriodRange(filters.period, now);
  const employeeWhere = {
    active: true,
    ...(filters.department ? { department: filters.department } : {}),
    ...(filters.positionId ? { positionId: filters.positionId } : {}),
  };
  const deliveryWhere = {
    ...(periodRange
      ? {
          issuedAt: {
            gte: periodRange.start,
            lt: periodRange.end,
          },
        }
      : {}),
    employee: {
      ...(filters.department ? { department: filters.department } : {}),
      ...(filters.positionId ? { positionId: filters.positionId } : {}),
    },
  };

  const [
    activeEmployeesCount,
    planningReport,
    activeEmployees,
    deliveryTypeCounts,
    recentDeliveries,
  ] = await Promise.all([
    prisma.employee.count({ where: employeeWhere }),
    getPlanningReport({
      department: filters.department,
      positionId: filters.positionId,
    }),
    prisma.employee.findMany({
      where: employeeWhere,
      select: {
        id: true,
        name: true,
        department: true,
        positionId: true,
        position: {
          select: {
            name: true,
            kitRevisions: {
              where: { isActive: true },
              take: 1,
              select: {
                items: {
                  select: {
                    materialId: true,
                    quantity: true,
                    periodDays: true,
                    material: {
                      select: {
                        category: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        assignments: {
          where: { status: "ISSUED" },
          select: {
            materialId: true,
            quantity: true,
            expiresAt: true,
          },
        },
      },
    }),
    prisma.delivery.groupBy({
      by: ["type"],
      where: deliveryWhere,
      _count: {
        _all: true,
      },
    }),
    prisma.delivery.findMany({
      where: deliveryWhere,
      orderBy: { issuedAt: "desc" },
      take: 8,
      include: {
        document: {
          select: {
            version: true,
          },
        },
        employee: {
          select: {
            name: true,
          },
        },
        items: {
          select: {
            quantity: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const criticalStockCount = planningReport.filter(
    (item: any) => item.status === "CRITICAL",
  ).length;

  const criticalMaterials = planningReport
    .filter((item: any) => item.status === "CRITICAL")
    .sort((left: any, right: any) => {
      if (left.stock !== right.stock) {
        return left.stock - right.stock;
      }

      return right.totalSuggested - left.totalSuggested;
    })
    .slice(0, 6);

  const { pendingEmployeeCount, pendingEmployees, aggregateReports } =
    buildPendingEmployeeAnalytics({
      activeEmployees: activeEmployees.map((employee: any) => ({
        id: employee.id,
        name: employee.name,
        department: employee.department,
        positionId: employee.positionId,
        positionName: employee.position.name,
        requiredItems:
          employee.position.kitRevisions[0]?.items.map((item: any) => ({
            materialId: item.materialId,
            quantity: item.quantity,
            periodDays: item.periodDays,
            category: item.material.category,
          })) ?? [],
        assignments: employee.assignments,
      })),
      now,
    });

  const deliveryBreakdown = deliveryTypeCounts.reduce(
    (accumulator: { total: number; uniform: number; ppe: number }, deliveryTypeCount: any) => {
      const count = deliveryTypeCount._count._all;
      accumulator.total += count;

      if (deliveryTypeCount.type === "PPE") {
        accumulator.ppe += count;
      } else {
        accumulator.uniform += count;
      }

      return accumulator;
    },
    {
      total: 0,
      uniform: 0,
      ppe: 0,
    },
  );

  return {
    filters,
    metrics: {
      activeEmployees: {
        label: "Colaboradores ativos",
        value: activeEmployeesCount,
        description: "Base ativa apta para entregas e controle operacional.",
      },
      pendingEmployees: {
        label: "Colaboradores com pendencias",
        value: pendingEmployeeCount,
        description: "Pendencias calculadas a partir do kit ativo do cargo e itens emitidos.",
      },
      criticalStockItems: {
        label: "Itens com estoque critico",
        value: criticalStockCount,
        description: "Materiais abaixo do minimo configurado e com reposicao prioritaria.",
      },
      deliveriesThisMonth: {
        label: "Entregas do mes",
        value: deliveryBreakdown.total,
        description: "Eventos registrados no periodo filtrado, somando fardamento e EPI.",
      },
    },
    deliveryBreakdown,
    aggregateReports,
    criticalMaterials,
    pendingEmployees,
    recentDeliveries: recentDeliveries.map((delivery: any) => ({
      id: delivery.id,
      employeeId: delivery.employeeId,
      issuedAt: delivery.issuedAt,
      type: delivery.type,
      employeeName: delivery.employee.name,
      itemCount: delivery.items.reduce((total: number, item: any) => total + item.quantity, 0),
      operatorName: delivery.user.name,
      documentVersion: delivery.document?.version ?? null,
    })),
    generatedAt: now,
  };
}
