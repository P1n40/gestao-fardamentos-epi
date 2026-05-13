import assert from "node:assert/strict";
import test from "node:test";

import {
  autoDetectKitTemplateMappings,
  buildKitTemplateReferenceMaps,
  normalizeMappedKitTemplateRow,
  processKitTemplatePipelineRow,
} from "../modules/importacao/kit-templates-pipeline";

test("autoDetectKitTemplateMappings finds common headers for template imports", () => {
  const mappings = autoDetectKitTemplateMappings([
    "Modelo de Kit",
    "Descricao",
    "SKU do Material",
    "Quantidade",
    "Obrigatorio",
  ]);

  assert.equal(mappings.templateName, "Modelo de Kit");
  assert.equal(mappings.description, "Descricao");
  assert.equal(mappings.materialSku, "SKU do Material");
  assert.equal(mappings.quantity, "Quantidade");
  assert.equal(mappings.mandatory, "Obrigatorio");
});

test("normalizeMappedKitTemplateRow normalizes model, material and flags", () => {
  const row = normalizeMappedKitTemplateRow({
    templateName: "kit operacional basico",
    materialSku: " unif-01 ",
    materialName: "camisa polo azul",
    materialSize: " m ",
    quantity: "2",
    periodDays: "180",
    mandatory: "sim",
  });

  assert.equal(row.templateName, "Kit Operacional Basico");
  assert.equal(row.materialSku, "UNIF-01");
  assert.equal(row.materialName, "Camisa Polo Azul");
  assert.equal(row.materialSize, "M");
  assert.equal(row.quantity, 2);
  assert.equal(row.periodDays, 180);
  assert.equal(row.mandatory, true);
});

test("processKitTemplatePipelineRow resolves material by SKU", () => {
  const referenceMaps = buildKitTemplateReferenceMaps({
    materials: [
      {
        id: "mat-1",
        name: "Camisa Polo Azul",
        size: "M",
        sku: "UNIF-POLO-M",
        active: true,
      },
    ],
  });

  const result = processKitTemplatePipelineRow(
    {
      "Modelo de Kit": "Kit Operacional",
      "SKU do Material": "UNIF-POLO-M",
      Quantidade: "2",
    },
    {
      templateName: "Modelo de Kit",
      materialSku: "SKU do Material",
      quantity: "Quantidade",
    },
    referenceMaps,
  );

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.templateName, "Kit Operacional");
    assert.equal(result.material.id, "mat-1");
    assert.equal(result.data.quantity, 2);
  }
});

test("processKitTemplatePipelineRow blocks ambiguous material names", () => {
  const referenceMaps = buildKitTemplateReferenceMaps({
    materials: [
      {
        id: "mat-1",
        name: "Camisa Polo Azul",
        size: null,
        sku: null,
        active: true,
      },
      {
        id: "mat-2",
        name: "Camisa Polo Azul",
        size: null,
        sku: null,
        active: true,
      },
    ],
  });

  const result = processKitTemplatePipelineRow(
    {
      "Modelo de Kit": "Kit Operacional",
      "Nome do Material": "Camisa Polo Azul",
      Quantidade: "2",
    },
    {
      templateName: "Modelo de Kit",
      materialName: "Nome do Material",
      quantity: "Quantidade",
    },
    referenceMaps,
  );

  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.errors[0]?.includes("Mais de uma variante"));
  }
});
