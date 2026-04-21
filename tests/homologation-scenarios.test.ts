import assert from "node:assert/strict";
import test from "node:test";

import {
  HOMOLOGATION_SCENARIOS,
  getCriticalHomologationScenarios,
  validateHomologationScenarioCatalog,
} from "../lib/homologation-scenarios";

test("homologation scenario catalog is valid and has critical coverage", () => {
  const scenarios = validateHomologationScenarioCatalog();

  assert.equal(scenarios.length, HOMOLOGATION_SCENARIOS.length);
  assert.ok(scenarios.length >= 10);
  assert.ok(getCriticalHomologationScenarios().length >= 4);
});

test("homologation scenario ids are unique", () => {
  const ids = HOMOLOGATION_SCENARIOS.map((scenario) => scenario.id);
  const uniqueIds = new Set(ids);

  assert.equal(uniqueIds.size, ids.length);
});

test("homologation scenario catalog covers the main business areas", () => {
  const areas = new Set(HOMOLOGATION_SCENARIOS.map((scenario) => scenario.area));

  ["auth", "kits", "estoque", "entregas", "documentos", "importacao", "planejamento"].forEach(
    (area) => assert.ok(areas.has(area as never), `Missing area ${area}`),
  );
});
