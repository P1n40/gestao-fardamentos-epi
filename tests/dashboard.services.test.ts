import test from "node:test";
import assert from "node:assert/strict";

import {
  aggregatePendingReports,
  evaluateEmployeePendingStatus,
  getMonthDateRange,
  resolveDashboardPeriodRange,
} from "../modules/dashboard/utils";

test("getMonthDateRange returns inclusive start and exclusive next-month boundary", () => {
  const range = getMonthDateRange(new Date("2026-04-19T15:20:00.000Z"));

  assert.equal(range.start.getFullYear(), 2026);
  assert.equal(range.start.getMonth(), 3);
  assert.equal(range.start.getDate(), 1);
  assert.equal(range.start.getHours(), 0);
  assert.equal(range.start.getMinutes(), 0);

  assert.equal(range.end.getFullYear(), 2026);
  assert.equal(range.end.getMonth(), 4);
  assert.equal(range.end.getDate(), 1);
  assert.equal(range.end.getHours(), 0);
  assert.equal(range.end.getMinutes(), 0);
});

test("evaluateEmployeePendingStatus marks missing required quantity as pending", () => {
  const result = evaluateEmployeePendingStatus({
    now: new Date("2026-04-19T00:00:00.000Z"),
    requiredItems: [
      {
        materialId: "mat-uniforme",
        quantity: 2,
        periodDays: null,
        category: "UNIFORM",
      },
      {
        materialId: "mat-epi",
        quantity: 1,
        periodDays: 180,
        category: "PPE",
      },
    ],
    assignments: [
      {
        materialId: "mat-uniforme",
        quantity: 1,
        expiresAt: null,
      },
    ],
  });

  assert.equal(result.hasPending, true);
  assert.equal(result.pendingItems, 2);
  assert.equal(result.missingUniformItems, 1);
  assert.equal(result.missingPpeItems, 1);
});

test("evaluateEmployeePendingStatus marks PPE close to expiry as warning without pending gap", () => {
  const result = evaluateEmployeePendingStatus({
    now: new Date("2026-04-01T00:00:00.000Z"),
    requiredItems: [
      {
        materialId: "mat-epi",
        quantity: 1,
        periodDays: 60,
        category: "PPE",
      },
    ],
    assignments: [
      {
        materialId: "mat-epi",
        quantity: 1,
        expiresAt: new Date("2026-04-20T00:00:00.000Z"),
      },
    ],
  });

  assert.equal(result.hasPending, false);
  assert.equal(result.pendingItems, 0);
  assert.equal(result.warningItems, 1);
});

test("resolveDashboardPeriodRange returns null for all_time", () => {
  assert.equal(resolveDashboardPeriodRange("all_time", new Date("2026-04-19T00:00:00.000Z")), null);
});

test("resolveDashboardPeriodRange returns 30-day window for last_30_days", () => {
  const result = resolveDashboardPeriodRange(
    "last_30_days",
    new Date("2026-04-19T00:00:00.000Z"),
  );

  assert.ok(result);
  assert.equal(result?.start.toISOString(), "2026-03-20T00:00:00.000Z");
  assert.equal(result?.end.toISOString(), "2026-04-19T00:00:00.000Z");
});

test("aggregatePendingReports consolidates pendencias by department and position", () => {
  const result = aggregatePendingReports({
    activeEmployees: [
      {
        department: "Saude",
        positionId: "pos-1",
        positionName: "Enfermeiro",
      },
      {
        department: "Saude",
        positionId: "pos-1",
        positionName: "Enfermeiro",
      },
      {
        department: "Educacao",
        positionId: "pos-2",
        positionName: "Professor",
      },
    ],
    pendingSummaries: [
      {
        department: "Saude",
        positionId: "pos-1",
        positionName: "Enfermeiro",
        pendingItems: 2,
        warningItems: 1,
        missingUniformItems: 1,
        missingPpeItems: 1,
      },
      {
        department: "Educacao",
        positionId: "pos-2",
        positionName: "Professor",
        pendingItems: 1,
        warningItems: 0,
        missingUniformItems: 1,
        missingPpeItems: 0,
      },
    ],
  });

  assert.equal(result.byDepartment[0]?.label, "Saude");
  assert.equal(result.byDepartment[0]?.activeEmployees, 2);
  assert.equal(result.byDepartment[0]?.employeesWithPending, 1);
  assert.equal(result.byDepartment[0]?.totalPendingItems, 2);
  assert.equal(result.byDepartment[0]?.missingPpeItems, 1);

  assert.equal(result.byPosition[0]?.label, "Enfermeiro");
  assert.equal(result.byPosition[0]?.activeEmployees, 2);
  assert.equal(result.byPosition[0]?.totalPendingItems, 2);
  assert.equal(result.byPosition[1]?.label, "Professor");
});
