import test from "node:test";
import assert from "node:assert/strict";

import {
  autoDetectMappings,
  normalizeMappedEmployeeRow,
  resolvePositionId,
} from "../modules/importacao/pipeline";

test("autoDetectMappings finds common employee spreadsheet headers", () => {
  const mappings = autoDetectMappings([
    "Nome Completo",
    "CPF",
    "Matrícula",
    "Secretaria",
    "Cargo/Função",
  ]);

  assert.equal(mappings.name, "Nome Completo");
  assert.equal(mappings.documentId, "CPF");
  assert.equal(mappings.registrationCode, "Matrícula");
  assert.equal(mappings.department, "Secretaria");
});

test("normalizeMappedEmployeeRow normalizes cpf, casing and sizes", () => {
  const row = normalizeMappedEmployeeRow({
    name: "  joao da silva ",
    documentId: "123.456.789-00",
    shirtSize: "m ",
    pantsSize: " 42",
    shoeSize: " 39 ",
  });

  assert.equal(row.name, "Joao Da Silva");
  assert.equal(row.documentId, "12345678900");
  assert.equal(row.shirtSize, "M");
  assert.equal(row.pantsSize, "42");
  assert.equal(row.shoeSize, "39");
});

test("resolvePositionId matches normalized position name", () => {
  const positionMap = new Map<string, string>([
    ["auxiliar de servicos gerais", "pos_1"],
    ["tecnico de enfermagem", "pos_2"],
  ]);

  assert.equal(resolvePositionId("Técnico de Enfermagem", positionMap), "pos_2");
  assert.equal(resolvePositionId("Cargo Inexistente", positionMap), null);
});
