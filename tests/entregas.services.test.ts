import test from "node:test";
import assert from "node:assert/strict";

import {
  assertMaterialsMatchDeliveryType,
  calculateAssignmentExpiryDate,
} from "../modules/entregas/services";

test("assertMaterialsMatchDeliveryType accepts homogeneous delivery category", () => {
  assert.doesNotThrow(() =>
    assertMaterialsMatchDeliveryType(
      [
        { name: "Capacete", category: "PPE" },
        { name: "Luva", category: "PPE" },
      ],
      "PPE",
    ),
  );
});

test("assertMaterialsMatchDeliveryType rejects mixed categories", () => {
  assert.throws(
    () =>
      assertMaterialsMatchDeliveryType(
        [
          { name: "Calca Operacional", category: "UNIFORM" },
          { name: "Luva", category: "PPE" },
        ],
        "PPE",
      ),
    /Conflito de categoria/i,
  );
});

test("calculateAssignmentExpiryDate returns null for uniform deliveries", () => {
  assert.equal(
    calculateAssignmentExpiryDate({
      type: "UNIFORM",
      periodDays: 30,
      baseDate: new Date("2026-01-01T00:00:00.000Z"),
    }),
    null,
  );
});

test("calculateAssignmentExpiryDate calculates PPE expiry from base date", () => {
  const result = calculateAssignmentExpiryDate({
    type: "PPE",
    periodDays: 15,
    baseDate: new Date("2026-01-01T00:00:00.000Z"),
  });

  assert.ok(result instanceof Date);
  assert.equal(result?.toISOString(), "2026-01-16T00:00:00.000Z");
});
