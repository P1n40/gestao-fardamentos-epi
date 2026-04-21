"use client";

import { Download } from "lucide-react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";

const TEMPLATE_HEADERS = [
  "Nome",
  "Categoria",
  "Unidade",
  "Tamanho",
  "SKU",
  "CA",
  "Estoque Minimo",
  "Estoque Inicial",
  "Descricao",
  "Ativo",
];

const TEMPLATE_SAMPLE = [
  "Camisa Polo Azul",
  "UNIFORM",
  "UN",
  "M",
  "UNIF-POLO-AZUL-M",
  "",
  "10",
  "25",
  "Camisa padrao da equipe",
  "SIM",
];

export function MaterialImportTemplateButton({ size = "sm" }: { size?: "sm" | "default" }) {
  function downloadTemplate() {
    const worksheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_SAMPLE]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Materiais");
    const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "template-importacao-materiais.xlsx";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" size={size} className="gap-2" onClick={downloadTemplate}>
      <Download className="h-4 w-4" />
      Baixar template
    </Button>
  );
}
