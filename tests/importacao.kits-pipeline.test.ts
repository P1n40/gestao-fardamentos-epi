import assert from "node:assert/strict";
import test from "node:test";

import {
  autoDetectKitMappings,
  buildKitImportGroupKey,
  buildKitReferenceMaps,
  normalizeMappedKitRow,
  processKitPipelineRow,
} from "../modules/importacao/kits-pipeline";

test("autoDetectKitMappings finds common headers for kit imports", () => {
  const mappings = autoDetectKitMappings([
    "Cargo",
    "Inicio da Vigencia",
    "Observacoes da Revisao",
    "SKU do Material",
    "Quantidade",
    "Obrigatorio",
  ]);

  assert.equal(mappings.positionName, "Cargo");
  assert.equal(mappings.validFrom, "Inicio da Vigencia");
  assert.equal(mappings.notes, "Observacoes da Revisao");
  assert.equal(mappings.materialSku, "SKU do Material");
  assert.equal(mappings.quantity, "Quantidade");
  assert.equal(mappings.mandatory, "Obrigatorio");
});

test("normalizeMappedKitRow normalizes names, dates, size and mandatory flag", () => {
  const row = normalizeMappedKitRow({
    positionName: "auxiliar de obras",
    validFrom: "19/04/2026",
    materialName: "camisa polo azul",
    materialSku: " unif-01 ",
    materialSize: " m ",
    mandatory: "sim",
  });

  assert.deepEqual(row, {
    positionName: "Auxiliar De Obras",
    validFrom: new Date("2026-04-19T03:00:00.000Z"),
    materialName: "Camisa Polo Azul",
    materialSku: "UNIF-01",
    materialSize: "M",
    mandatory: true,
  });
});

test("buildKitImportGroupKey consolidates position and validity date", () => {
  assert.equal(
    buildKitImportGroupKey("pos-1", new Date("2026-05-01T12:00:00.000Z")),
    "pos-1::2026-05-01",
  );
});

test("processKitPipelineRow resolves create rows using SKU and position", () => {
  const referenceMaps = buildKitReferenceMaps({
    positions: [
      {
        id: "pos-1",
        name: "Auxiliar de Obras",
        requiresUniform: true,
        requiresPPE: true,
        active: true,
      },
    ],
    materials: [
      {
        id: "mat-1",
        name: "Camisa Polo Azul",
        category: "UNIFORM",
        size: "M",
        sku: "UNIF-POLO-M",
        active: true,
      },
    ],
    draftRevisions: [],
  });

  const result = processKitPipelineRow(
    {
      Cargo: "Auxiliar de Obras",
      "Inicio da Vigencia": "2026-05-01",
      "SKU do Material": "UNIF-POLO-M",
      Quantidade: "2",
      Obrigatorio: "SIM",
    },
    {
      positionName: "Cargo",
      validFrom: "Inicio da Vigencia",
      materialSku: "SKU do Material",
      quantity: "Quantidade",
      mandatory: "Obrigatorio",
    },
    referenceMaps,
  );

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.resolution.classification, "CREATE");
    assert.equal(result.resolution.position.id, "pos-1");
    assert.equal(result.resolution.material.id, "mat-1");
    assert.equal(result.resolution.groupKey, "pos-1::2026-05-01");
  }
});

test("processKitPipelineRow returns ambiguous when material name matches multiple variants", () => {
  const referenceMaps = buildKitReferenceMaps({
    positions: [
      {
        id: "pos-1",
        name: "Auxiliar de Obras",
        requiresUniform: true,
        requiresPPE: false,
        active: true,
      },
    ],
    materials: [
      {
        id: "mat-1",
        name: "Camisa Polo Azul",
        category: "UNIFORM",
        size: "M",
        sku: "UNIF-POLO-M",
        active: true,
      },
      {
        id: "mat-2",
        name: "Camisa Polo Azul",
        category: "UNIFORM",
        size: "G",
        sku: "UNIF-POLO-G",
        active: true,
      },
    ],
    draftRevisions: [],
  });

  const result = processKitPipelineRow(
    {
      Cargo: "Auxiliar de Obras",
      "Inicio da Vigencia": "2026-05-01",
      "Nome do Material": "Camisa Polo Azul",
      Quantidade: "2",
    },
    {
      positionName: "Cargo",
      validFrom: "Inicio da Vigencia",
      materialName: "Nome do Material",
      quantity: "Quantidade",
    },
    referenceMaps,
  );

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.classification, "AMBIGUOUS");
    assert.ok(result.errors[0]?.includes("mais de uma variante"));
  }
});

test("processKitPipelineRow blocks category conflicts with position requirements", () => {
  const referenceMaps = buildKitReferenceMaps({
    positions: [
      {
        id: "pos-1",
        name: "Administrativo",
        requiresUniform: true,
        requiresPPE: false,
        active: true,
      },
    ],
    materials: [
      {
        id: "mat-1",
        name: "Bota de Seguranca",
        category: "PPE",
        size: "40",
        sku: "PPE-BOOT-40",
        active: true,
      },
    ],
    draftRevisions: [],
  });

  const result = processKitPipelineRow(
    {
      Cargo: "Administrativo",
      "Inicio da Vigencia": "2026-05-01",
      "SKU do Material": "PPE-BOOT-40",
      Quantidade: "1",
    },
    {
      positionName: "Cargo",
      validFrom: "Inicio da Vigencia",
      materialSku: "SKU do Material",
      quantity: "Quantidade",
    },
    referenceMaps,
  );

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.classification, "ERROR");
    assert.ok(result.errors[0]?.includes("nao aceita itens de EPI"));
  }
});
