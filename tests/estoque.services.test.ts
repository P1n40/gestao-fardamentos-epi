import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPrioritizedReplenishmentReport,
  buildMaterialProjectionSignals,
  buildHistoricalConsumptionSummary,
  calculatePurchaseSuggestionBreakdown,
  calculateRuptureRisk,
  calculateStockBalanceTransition,
  getPlanningItemStatus,
  inferMaterialSizingDimension,
  matchMaterialVariantToEmployee,
} from "../modules/estoque/services";

test("calculateStockBalanceTransition returns updated balances for valid movement", () => {
  const result = calculateStockBalanceTransition({
    balanceBefore: 10,
    quantity: -3,
    materialName: "Luva",
  });

  assert.deepEqual(result, {
    balanceBefore: 10,
    balanceAfter: 7,
  });
});

test("calculateStockBalanceTransition blocks negative resulting balance", () => {
  assert.throws(
    () =>
      calculateStockBalanceTransition({
        balanceBefore: 2,
        quantity: -5,
        materialName: "Bota",
      }),
    /Saldo insuficiente/i,
  );
});

test("getPlanningItemStatus prioritizes critical stock before field gap", () => {
  assert.equal(getPlanningItemStatus({ stock: 1, minStock: 3, missingInField: 10 }), "CRITICAL");
  assert.equal(getPlanningItemStatus({ stock: 5, minStock: 3, missingInField: 2 }), "WARNING");
  assert.equal(getPlanningItemStatus({ stock: 5, minStock: 3, missingInField: 0 }), "OK");
});

test("buildHistoricalConsumptionSummary consolidates 30d, 90d and coverage per variant", () => {
  const referenceDate = new Date("2026-04-19T12:00:00.000Z");

  const summary = buildHistoricalConsumptionSummary({
    currentStock: 12,
    referenceDate,
    entries: [
      { quantity: 2, issuedAt: new Date("2026-04-15T10:00:00.000Z") },
      { quantity: 3, issuedAt: new Date("2026-03-20T10:00:00.000Z") },
      { quantity: 4, issuedAt: new Date("2026-02-25T10:00:00.000Z") },
      { quantity: 5, issuedAt: new Date("2025-12-01T10:00:00.000Z") },
    ],
  });

  assert.deepEqual(summary, {
    totalConsumed: 14,
    consumedLast30Days: 2,
    consumedLast90Days: 9,
    averageMonthlyConsumption: 3,
    recommendedMonthlyBuffer: 3,
    stockCoverageMonths: 4,
    lastConsumedAt: new Date("2026-04-15T10:00:00.000Z"),
  });
});

test("buildHistoricalConsumptionSummary returns neutral metrics when there is no history", () => {
  const summary = buildHistoricalConsumptionSummary({
    currentStock: 7,
    referenceDate: new Date("2026-04-19T12:00:00.000Z"),
    entries: [],
  });

  assert.deepEqual(summary, {
    totalConsumed: 0,
    consumedLast30Days: 0,
    consumedLast90Days: 0,
    averageMonthlyConsumption: 0,
    recommendedMonthlyBuffer: 0,
    stockCoverageMonths: null,
    lastConsumedAt: null,
  });
});

test("inferMaterialSizingDimension identifies shirt, pants, shoe and generic materials", () => {
  assert.equal(inferMaterialSizingDimension({ name: "Camisa Polo Azul" }), "shirt");
  assert.equal(inferMaterialSizingDimension({ name: "Calca Brim" }), "pants");
  assert.equal(inferMaterialSizingDimension({ name: "Bota de Seguranca" }), "shoe");
  assert.equal(inferMaterialSizingDimension({ name: "Luva de Raspa" }), "generic");
});

test("matchMaterialVariantToEmployee respects employee shirt and shoe sizing", () => {
  assert.deepEqual(
    matchMaterialVariantToEmployee({
      material: { name: "Camisa Polo Azul", size: "M" },
      employee: { shirtSize: "m", pantsSize: "42", shoeSize: "39" },
    }),
    {
      matches: true,
      missingSizing: false,
      dimension: "shirt",
    },
  );

  assert.deepEqual(
    matchMaterialVariantToEmployee({
      material: { name: "Bota de Seguranca", size: "40" },
      employee: { shirtSize: "G", pantsSize: "42", shoeSize: null },
    }),
    {
      matches: false,
      missingSizing: true,
      dimension: "shoe",
    },
  );
});

test("calculatePurchaseSuggestionBreakdown crosses active base, stock and minimum buffer", () => {
  const result = calculatePurchaseSuggestionBreakdown({
    totalRequired: 10,
    currentAssignments: 6,
    stock: 3,
    minStock: 2,
  });

  assert.deepEqual(result, {
    fieldGap: 4,
    stockAvailableForRegularization: 3,
    activeBasePurchaseNeed: 1,
    remainingStockAfterRegularization: 0,
    minimumBufferPurchaseNeed: 2,
    totalSuggested: 3,
  });
});

test("calculatePurchaseSuggestionBreakdown uses stock first before purchasing for active base", () => {
  const result = calculatePurchaseSuggestionBreakdown({
    totalRequired: 8,
    currentAssignments: 6,
    stock: 5,
    minStock: 3,
  });

  assert.deepEqual(result, {
    fieldGap: 2,
    stockAvailableForRegularization: 2,
    activeBasePurchaseNeed: 0,
    remainingStockAfterRegularization: 3,
    minimumBufferPurchaseNeed: 0,
    totalSuggested: 0,
  });
});

test("buildMaterialProjectionSignals tracks admissions, missing sizing and inactive return potential", () => {
  const result = buildMaterialProjectionSignals({
    material: {
      id: "mat-1",
      name: "Camisa Polo Azul",
      size: "M",
    },
    requiredQuantityPerEmployee: 2,
    inactiveAssignedQuantity: 3,
    referenceDate: new Date("2026-04-19T12:00:00.000Z"),
    activeEmployees: [
      {
        positionId: "pos-1",
        createdAt: new Date("2026-04-10T10:00:00.000Z"),
        shirtSize: "M",
        pantsSize: "42",
        shoeSize: "39",
      },
      {
        positionId: "pos-1",
        createdAt: new Date("2026-02-01T10:00:00.000Z"),
        shirtSize: null,
        pantsSize: "40",
        shoeSize: "38",
      },
      {
        positionId: "pos-1",
        createdAt: new Date("2026-04-05T10:00:00.000Z"),
        shirtSize: "G",
        pantsSize: "44",
        shoeSize: "40",
      },
    ],
  });

  assert.deepEqual(result, {
    recentAdmissionsDemand: 2,
    potentialReturnsFromInactive: 3,
    missingSizingData: 2,
  });
});

test("calculateRuptureRisk prioritizes critical items with immediate purchase pressure", () => {
  const risk = calculateRuptureRisk({
    id: "mat-1",
    name: "Bota de Seguranca",
    category: "PPE",
    unit: "UN",
    size: "40",
    stock: 0,
    minStock: 2,
    totalRequired: 8,
    currentAssignments: 3,
    missingInField: 5,
    replenishmentNeed: 2,
    purchaseSuggestion: {
      fieldGap: 5,
      stockAvailableForRegularization: 0,
      activeBasePurchaseNeed: 5,
      remainingStockAfterRegularization: 0,
      minimumBufferPurchaseNeed: 2,
      totalSuggested: 7,
    },
    totalSuggested: 7,
    historicalConsumption: {
      totalConsumed: 12,
      consumedLast30Days: 4,
      consumedLast90Days: 9,
      averageMonthlyConsumption: 3,
      recommendedMonthlyBuffer: 3,
      stockCoverageMonths: 0,
      lastConsumedAt: new Date("2026-04-18T10:00:00.000Z"),
    },
    projectionSignals: {
      recentAdmissionsDemand: 2,
      potentialReturnsFromInactive: 1,
      missingSizingData: 1,
    },
    status: "CRITICAL",
  });

  assert.equal(risk.riskLevel, "HIGH");
  assert.ok(risk.riskScore >= 60);
  assert.ok(risk.reasons.includes("Abaixo do estoque minimo"));
  assert.ok(risk.reasons.includes("Compra imediata para base ativa"));
});

test("buildPrioritizedReplenishmentReport sorts highest rupture risk first", () => {
  const result = buildPrioritizedReplenishmentReport([
    {
      id: "mat-high",
      name: "Bota de Seguranca",
      category: "PPE",
      unit: "UN",
      size: "40",
      stock: 0,
      minStock: 2,
      totalRequired: 8,
      currentAssignments: 3,
      missingInField: 5,
      replenishmentNeed: 2,
      purchaseSuggestion: {
        fieldGap: 5,
        stockAvailableForRegularization: 0,
        activeBasePurchaseNeed: 5,
        remainingStockAfterRegularization: 0,
        minimumBufferPurchaseNeed: 2,
        totalSuggested: 7,
      },
      totalSuggested: 7,
      historicalConsumption: {
        totalConsumed: 12,
        consumedLast30Days: 4,
        consumedLast90Days: 9,
        averageMonthlyConsumption: 3,
        recommendedMonthlyBuffer: 3,
        stockCoverageMonths: 0.5,
        lastConsumedAt: new Date("2026-04-18T10:00:00.000Z"),
      },
      projectionSignals: {
        recentAdmissionsDemand: 2,
        potentialReturnsFromInactive: 1,
        missingSizingData: 0,
      },
      status: "CRITICAL",
    },
    {
      id: "mat-low",
      name: "Luva de Raspa",
      category: "PPE",
      unit: "UN",
      size: null,
      stock: 30,
      minStock: 10,
      totalRequired: 20,
      currentAssignments: 20,
      missingInField: 0,
      replenishmentNeed: 0,
      purchaseSuggestion: {
        fieldGap: 0,
        stockAvailableForRegularization: 0,
        activeBasePurchaseNeed: 0,
        remainingStockAfterRegularization: 30,
        minimumBufferPurchaseNeed: 0,
        totalSuggested: 0,
      },
      totalSuggested: 0,
      historicalConsumption: {
        totalConsumed: 6,
        consumedLast30Days: 1,
        consumedLast90Days: 3,
        averageMonthlyConsumption: 1,
        recommendedMonthlyBuffer: 1,
        stockCoverageMonths: 30,
        lastConsumedAt: new Date("2026-04-10T10:00:00.000Z"),
      },
      projectionSignals: {
        recentAdmissionsDemand: 0,
        potentialReturnsFromInactive: 0,
        missingSizingData: 1,
      },
      status: "OK",
    },
  ]);

  assert.equal(result.summary.highRiskItems, 1);
  assert.equal(result.summary.suggestedUnits, 7);
  assert.equal(result.summary.immediateUnits, 5);
  assert.equal(result.items[0]?.id, "mat-high");
});
