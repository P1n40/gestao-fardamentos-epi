import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDocumentHash,
  filterAssignmentsForDocumentDate,
  resolveNextDocumentVersion,
} from "../modules/documentos/services";

test("resolveNextDocumentVersion increments PPE version from latest document", () => {
  assert.equal(
    resolveNextDocumentVersion({
      type: "PPE",
      requestedVersion: 1,
      latestVersion: 3,
    }),
    4,
  );
});

test("resolveNextDocumentVersion keeps requested version for uniform receipt", () => {
  assert.equal(
    resolveNextDocumentVersion({
      type: "UNIFORM",
      requestedVersion: 2,
      latestVersion: 9,
    }),
    2,
  );
});

test("buildDocumentHash is deterministic for same payload", () => {
  const payload = {
    employeeId: "emp_1",
    items: [{ materialId: "mat_1", quantity: 2 }],
  };

  assert.equal(buildDocumentHash(payload), buildDocumentHash(payload));
});

test("filterAssignmentsForDocumentDate returns only events up to target issue date", () => {
  const assignments = [
    { id: "1", issuedAt: new Date("2026-01-01T00:00:00.000Z") },
    { id: "2", issuedAt: new Date("2026-01-05T00:00:00.000Z") },
    { id: "3", issuedAt: new Date("2026-01-10T00:00:00.000Z") },
  ];

  const result = filterAssignmentsForDocumentDate(
    assignments,
    new Date("2026-01-06T00:00:00.000Z"),
  );

  assert.deepEqual(
    result.map((assignment) => assignment.id),
    ["1", "2"],
  );
});
