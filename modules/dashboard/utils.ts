const PENDING_LOOKAHEAD_DAYS = 30;

export type DashboardPeriod =
  | "current_month"
  | "last_30_days"
  | "current_quarter"
  | "current_year"
  | "all_time";

export function getMonthDateRange(referenceDate = new Date()) {
  const start = new Date(referenceDate);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  return { start, end };
}

export function resolveDashboardPeriodRange(period: DashboardPeriod, referenceDate = new Date()) {
  if (period === "all_time") {
    return null;
  }

  if (period === "current_month") {
    return getMonthDateRange(referenceDate);
  }

  if (period === "last_30_days") {
    const end = new Date(referenceDate);
    const start = new Date(referenceDate);
    start.setDate(start.getDate() - 30);
    return { start, end };
  }

  if (period === "current_year") {
    const start = new Date(referenceDate);
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    return { start, end };
  }

  const month = referenceDate.getMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  const start = new Date(referenceDate);
  start.setMonth(quarterStartMonth, 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 3);

  return { start, end };
}

export function evaluateEmployeePendingStatus(params: {
  requiredItems: Array<{
    materialId: string;
    quantity: number;
    periodDays: number | null;
    category: "UNIFORM" | "PPE";
  }>;
  assignments: Array<{
    materialId: string;
    quantity: number;
    expiresAt: Date | null;
  }>;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const warningThreshold = new Date(now);
  warningThreshold.setDate(warningThreshold.getDate() + PENDING_LOOKAHEAD_DAYS);

  let pendingItems = 0;
  let warningItems = 0;
  let missingUniformItems = 0;
  let missingPpeItems = 0;

  for (const requiredItem of params.requiredItems) {
    const itemAssignments = params.assignments.filter(
      (assignment) => assignment.materialId === requiredItem.materialId,
    );

    const validAssignments = itemAssignments.filter(
      (assignment) => !assignment.expiresAt || assignment.expiresAt > now,
    );

    const validQuantity = validAssignments.reduce(
      (total, assignment) => total + assignment.quantity,
      0,
    );

    if (validQuantity < requiredItem.quantity) {
      pendingItems += 1;

      if (requiredItem.category === "PPE") {
        missingPpeItems += 1;
      } else {
        missingUniformItems += 1;
      }

      continue;
    }

    const nextExpiry = validAssignments
      .map((assignment) => assignment.expiresAt)
      .filter((expiresAt): expiresAt is Date => expiresAt instanceof Date)
      .sort((left, right) => left.getTime() - right.getTime())[0];

    if (requiredItem.periodDays && nextExpiry && nextExpiry <= warningThreshold) {
      warningItems += 1;
    }
  }

  return {
    hasPending: pendingItems > 0,
    pendingItems,
    warningItems,
    missingUniformItems,
    missingPpeItems,
  };
}

export interface PendingSummaryInput {
  department: string | null;
  positionId: string;
  positionName: string;
  pendingItems: number;
  warningItems: number;
  missingUniformItems: number;
  missingPpeItems: number;
}

export interface AggregatePendingReportItem {
  key: string;
  label: string;
  activeEmployees: number;
  employeesWithPending: number;
  employeesWithWarnings: number;
  totalPendingItems: number;
  totalWarningItems: number;
  missingUniformItems: number;
  missingPpeItems: number;
}

export interface PendingEmployeeSummary extends PendingSummaryInput {
  employeeId: string;
  employeeName: string;
  hasPending: boolean;
}

export function aggregatePendingReports(params: {
  activeEmployees: Array<{
    department: string | null;
    positionId: string;
    positionName: string;
  }>;
  pendingSummaries: PendingSummaryInput[];
}) {
  const byDepartment = new Map<string, AggregatePendingReportItem>();
  const byPosition = new Map<string, AggregatePendingReportItem>();

  for (const employee of params.activeEmployees) {
    const departmentKey = employee.department?.trim() || "Sem secretaria";
    const departmentEntry = byDepartment.get(departmentKey) ?? {
      key: departmentKey,
      label: departmentKey,
      activeEmployees: 0,
      employeesWithPending: 0,
      employeesWithWarnings: 0,
      totalPendingItems: 0,
      totalWarningItems: 0,
      missingUniformItems: 0,
      missingPpeItems: 0,
    };
    departmentEntry.activeEmployees += 1;
    byDepartment.set(departmentKey, departmentEntry);

    const positionEntry = byPosition.get(employee.positionId) ?? {
      key: employee.positionId,
      label: employee.positionName,
      activeEmployees: 0,
      employeesWithPending: 0,
      employeesWithWarnings: 0,
      totalPendingItems: 0,
      totalWarningItems: 0,
      missingUniformItems: 0,
      missingPpeItems: 0,
    };
    positionEntry.activeEmployees += 1;
    byPosition.set(employee.positionId, positionEntry);
  }

  for (const summary of params.pendingSummaries) {
    const departmentKey = summary.department?.trim() || "Sem secretaria";
    const departmentEntry = byDepartment.get(departmentKey);
    const positionEntry = byPosition.get(summary.positionId);

    if (departmentEntry) {
      if (summary.pendingItems > 0) {
        departmentEntry.employeesWithPending += 1;
      }
      if (summary.warningItems > 0) {
        departmentEntry.employeesWithWarnings += 1;
      }
      departmentEntry.totalPendingItems += summary.pendingItems;
      departmentEntry.totalWarningItems += summary.warningItems;
      departmentEntry.missingUniformItems += summary.missingUniformItems;
      departmentEntry.missingPpeItems += summary.missingPpeItems;
    }

    if (positionEntry) {
      if (summary.pendingItems > 0) {
        positionEntry.employeesWithPending += 1;
      }
      if (summary.warningItems > 0) {
        positionEntry.employeesWithWarnings += 1;
      }
      positionEntry.totalPendingItems += summary.pendingItems;
      positionEntry.totalWarningItems += summary.warningItems;
      positionEntry.missingUniformItems += summary.missingUniformItems;
      positionEntry.missingPpeItems += summary.missingPpeItems;
    }
  }

  const sortAggregateReport = (items: AggregatePendingReportItem[]) =>
    items
      .filter((item) => item.activeEmployees > 0)
      .sort((left, right) => {
        if (left.totalPendingItems !== right.totalPendingItems) {
          return right.totalPendingItems - left.totalPendingItems;
        }

        if (left.employeesWithPending !== right.employeesWithPending) {
          return right.employeesWithPending - left.employeesWithPending;
        }

        return left.label.localeCompare(right.label, "pt-BR");
      });

  return {
    byDepartment: sortAggregateReport([...byDepartment.values()]),
    byPosition: sortAggregateReport([...byPosition.values()]),
  };
}

export function buildPendingEmployeeAnalytics(params: {
  activeEmployees: Array<{
    id: string;
    name: string;
    department: string | null;
    positionId: string;
    positionName: string;
    requiredItems: Array<{
      materialId: string;
      quantity: number;
      periodDays: number | null;
      category: "UNIFORM" | "PPE";
    }>;
    assignments: Array<{
      materialId: string;
      quantity: number;
      expiresAt: Date | null;
    }>;
  }>;
  now?: Date;
}) {
  const now = params.now ?? new Date();

  const pendingEmployeeSummaries: PendingEmployeeSummary[] = params.activeEmployees
    .map((employee) => {
      const status = evaluateEmployeePendingStatus({
        requiredItems: employee.requiredItems,
        assignments: employee.assignments,
        now,
      });

      return {
        employeeId: employee.id,
        employeeName: employee.name,
        department: employee.department,
        positionId: employee.positionId,
        positionName: employee.positionName,
        ...status,
      };
    })
    .filter((employee) => employee.hasPending || employee.warningItems > 0)
    .sort((left, right) => {
      if (left.pendingItems !== right.pendingItems) {
        return right.pendingItems - left.pendingItems;
      }

      return right.warningItems - left.warningItems;
    });

  return {
    pendingEmployeeCount: pendingEmployeeSummaries.filter((employee) => employee.pendingItems > 0).length,
    pendingEmployees: pendingEmployeeSummaries
      .slice(0, 8)
      .map(({ hasPending: _hasPending, ...employee }) => employee),
    pendingEmployeeSummaries,
    aggregateReports: aggregatePendingReports({
      activeEmployees: params.activeEmployees.map((employee) => ({
        department: employee.department,
        positionId: employee.positionId,
        positionName: employee.positionName,
      })),
      pendingSummaries: pendingEmployeeSummaries.map(
        ({ hasPending: _hasPending, employeeId: _employeeId, employeeName: _employeeName, ...employee }) => employee,
      ),
    }),
  };
}
