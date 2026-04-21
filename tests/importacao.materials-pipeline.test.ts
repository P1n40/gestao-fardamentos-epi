import assert from "node:assert/strict";
import test from "node:test";

import {
  autoDetectMaterialMappings,
  buildMaterialReferenceMaps,
  normalizeMappedMaterialRow,
  processMaterialPipelineRow,
} from "../modules/importacao/materials-pipeline";
import { inferMaterialSizingDimension } from "../modules/estoque/services";

test("autoDetectMaterialMappings finds common headers for material imports", () => {
  const mappings = autoDetectMaterialMappings([
    "Nome do Material",
    "Categoria",
    "Unidade",
    "SKU",
    "Estoque Mínimo",
    "Estoque Inicial",
  ]);

  assert.equal(mappings.name, "Nome do Material");
  assert.equal(mappings.category, "Categoria");
  assert.equal(mappings.unit, "Unidade");
  assert.equal(mappings.sku, "SKU");
  assert.equal(mappings.minStock, "Estoque Mínimo");
  assert.equal(mappings.stock, "Estoque Inicial");
});

test("normalizeMappedMaterialRow normalizes category, size, sku and active flag", () => {
  const row = normalizeMappedMaterialRow({
    name: "camisa polo azul",
    category: "fardamento",
    unit: "un",
    size: " m ",
    sku: " unif-01 ",
    active: "sim",
  });

  assert.deepEqual(row, {
    name: "Camisa Polo Azul",
    category: "UNIFORM",
    unit: "UN",
    size: "M",
    sku: "UNIF-01",
    active: true,
  });
});

test("inferMaterialSizingDimension detects generic and shirt material types", () => {
  assert.equal(inferMaterialSizingDimension({ name: "Camisa Polo Azul" }), "shirt");
  assert.equal(inferMaterialSizingDimension({ name: "Luva de Raspa" }), "generic");
});

test("processMaterialPipelineRow validates and classifies create and update rows", () => {
  const referenceMaps = buildMaterialReferenceMaps([
    {
      id: "mat-1",
      name: "Camisa Polo Azul",
      category: "UNIFORM",
      size: "M",
      sku: "UNIF-POLO-AZUL-M",
      unit: "UN",
      minStock: 10,
      description: "Atual",
      caNumber: null,
      active: true,
      stock: 4,
    },
  ]);

  const updateResult = processMaterialPipelineRow(
    {
      Nome: "Camisa Polo Azul",
      Categoria: "UNIFORM",
      Unidade: "UN",
      Tamanho: "M",
      SKU: "UNIF-POLO-AZUL-M",
      "Estoque Mínimo": "15",
      "Estoque Inicial": "20",
    },
    {
      name: "Nome",
      category: "Categoria",
      unit: "Unidade",
      size: "Tamanho",
      sku: "SKU",
      minStock: "Estoque Mínimo",
      stock: "Estoque Inicial",
    },
    referenceMaps,
  );

  assert.equal(updateResult.success, true);
  if (updateResult.success) {
    assert.equal(updateResult.reconciliation.classification, "UPDATE");
    assert.equal(updateResult.data.minStock, 15);
    assert.equal(updateResult.data.stock, 20);
  }

  const createResult = processMaterialPipelineRow(
    {
      Nome: "Bota de Seguranca",
      Categoria: "PPE",
      Unidade: "PAR",
      Tamanho: "40",
      SKU: "PPE-BOOT-40",
      "Estoque Mínimo": "5",
      "Estoque Inicial": "12",
    },
    {
      name: "Nome",
      category: "Categoria",
      unit: "Unidade",
      size: "Tamanho",
      sku: "SKU",
      minStock: "Estoque Mínimo",
      stock: "Estoque Inicial",
    },
    referenceMaps,
  );

  assert.equal(createResult.success, true);
  if (createResult.success) {
    assert.equal(createResult.reconciliation.classification, "CREATE");
    assert.equal(createResult.data.category, "PPE");
  }
});

test("processMaterialPipelineRow reports validation errors for invalid category", () => {
  const result = processMaterialPipelineRow(
    {
      Nome: "Item Invalido",
      Categoria: "OUTROS",
      Unidade: "UN",
      "Estoque Mínimo": "1",
      "Estoque Inicial": "0",
    },
    {
      name: "Nome",
      category: "Categoria",
      unit: "Unidade",
      minStock: "Estoque Mínimo",
      stock: "Estoque Inicial",
    },
    buildMaterialReferenceMaps([]),
  );

  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.errors.some((error) => error.includes("category")));
  }
});
