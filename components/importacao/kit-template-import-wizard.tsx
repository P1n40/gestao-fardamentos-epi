"use client";

import { CheckCircle2, ChevronRight, Download, FileSpreadsheet, FileText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  getKitTemplateMappingSuggestionsAction,
  importKitTemplatesAction,
} from "@/modules/importacao/kit-templates-actions";
import { KIT_TEMPLATE_TARGET_FIELDS } from "@/modules/importacao/kit-templates-pipeline";
import { FileParser, type ParseResult } from "@/modules/importacao/parser";
import type { ImportSummary } from "@/modules/importacao/schemas";

import { ImportResultView } from "./import-result-view";

type Step = "UPLOAD" | "MAPPING" | "IMPORTING" | "RESULT";

const REQUIRED_FIELDS = ["templateName", "quantity"];
const WIZARD_FIELDS = KIT_TEMPLATE_TARGET_FIELDS.map((field) => ({
  key: field.key,
  label: field.label,
  required: REQUIRED_FIELDS.includes(field.key),
}));

const TEMPLATE_HEADERS = [
  "Modelo de Kit",
  "Descricao",
  "SKU do Material",
  "Nome do Material",
  "Tamanho",
  "Quantidade",
  "Periodicidade Dias",
  "Obrigatorio",
];

const TEMPLATE_SAMPLE = [
  "Kit Operacional Basico",
  "Modelo padrao para equipe operacional",
  "UNIF-POLO-AZUL-M",
  "Camisa Polo Azul",
  "M",
  "2",
  "180",
  "SIM",
];

export function KitTemplateImportWizard() {
  const [step, setStep] = useState<Step>("UPLOAD");
  const [parsedData, setParsedData] = useState<ParseResult | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  function downloadTemplate() {
    const worksheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_SAMPLE]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Modelos de Kit");
    const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "template-importacao-modelos-de-kit.xlsx";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await FileParser.parse(file);
      const columns = result.data[0] ? Object.keys(result.data[0]) : [];
      const suggestedMappings = await getKitTemplateMappingSuggestionsAction(columns);
      setParsedData(result);
      setMappings(suggestedMappings);
      setStep("MAPPING");
      toast.success("Arquivo processado. Sugestões de mapeamento aplicadas.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao processar arquivo.");
    }
  }

  async function handleImport() {
    if (!parsedData) return;

    const missing = WIZARD_FIELDS.filter(
      (field) => field.required && (!mappings[field.key] || mappings[field.key] === "SKIP"),
    );

    if (missing.length > 0) {
      toast.error(
        `Mapeie os campos obrigatórios: ${missing.map((field) => field.label).join(", ")}`,
      );
      return;
    }

    setStep("IMPORTING");

    try {
      const result = await importKitTemplatesAction(parsedData.data, mappings);
      setSummary(result);
      setStep("RESULT");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao importar modelos.");
      setStep("MAPPING");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {step === "UPLOAD" && (
        <Card className="border-dashed py-12 text-center">
          <CardHeader>
            <FileSpreadsheet className="mx-auto h-12 w-12 text-zinc-400" />
            <CardTitle>Escolha o arquivo de modelos de kit</CardTitle>
            <CardDescription>
              Envie CSV ou Excel para criar ou atualizar modelos reutilizáveis e seus itens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap justify-center gap-3">
              <label className="cursor-pointer">
                <div className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
                  <FileText className="h-4 w-4" />
                  Selecionar arquivo
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                />
              </label>

              <Button type="button" variant="ghost" className="gap-2" onClick={downloadTemplate}>
                <Download className="h-4 w-4" />
                Baixar template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "MAPPING" && parsedData && (
        <Card>
          <CardHeader>
            <CardTitle>Configurar mapeamento de colunas</CardTitle>
            <CardDescription>
              Relacione o cabeçalho da planilha com os campos do modelo de kit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campo do sistema</TableHead>
                  <TableHead>Coluna no arquivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {WIZARD_FIELDS.map((field) => (
                  <TableRow key={field.key}>
                    <TableCell>
                      {field.label} {field.required && <span className="text-destructive">*</span>}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mappings[field.key] || ""}
                        onValueChange={(value) =>
                          setMappings((current) => ({ ...current, [field.key]: value || "" }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Ignorar campo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SKIP">--- Ignorar ---</SelectItem>
                          {parsedData.data[0] &&
                            Object.keys(parsedData.data[0]).map((column) => (
                              <SelectItem key={column} value={column}>
                                {column}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="ghost" onClick={() => setStep("UPLOAD")}>
              Voltar
            </Button>
            <Button onClick={handleImport} className="gap-2">
              Importar modelos
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === "IMPORTING" && (
        <Card className="py-20 text-center">
          <CardHeader>
            <FileSpreadsheet className="text-primary mx-auto h-12 w-12 animate-bounce" />
            <CardTitle>Importando modelos</CardTitle>
            <CardDescription>Gravando modelos e itens no catálogo de kits.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {step === "RESULT" && summary && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
              <CardTitle>Importação concluída</CardTitle>
              <CardDescription>O processamento dos modelos de kit foi finalizado.</CardDescription>
            </CardHeader>
          </Card>

          <ImportResultView summary={summary} showTitle />

          <Card>
            <CardFooter className="flex-col gap-3 py-6">
              <Link
                href="/materiais/kits/modelos"
                className={cn(buttonVariants({ variant: "default" }), "w-full sm:w-[240px]")}
              >
                Ver modelos
              </Link>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
