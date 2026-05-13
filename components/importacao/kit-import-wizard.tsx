"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  Settings2,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { OperationFeedback } from "@/components/shared/operation-feedback";
import { Badge } from "@/components/ui/badge";
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
  getKitMappingSuggestionsAction,
  importKitsAction,
  validateKitImportAction,
} from "@/modules/importacao/kits-actions";
import { KIT_TARGET_FIELDS } from "@/modules/importacao/kits-pipeline";
import { FileParser, type ParseResult } from "@/modules/importacao/parser";
import type { ImportSummary } from "@/modules/importacao/schemas";

import { ImportProgress } from "./import-progress";
import { ImportResultView } from "./import-result-view";

type Step = "UPLOAD" | "MAPPING" | "VALIDATING" | "REVIEW" | "IMPORTING" | "RESULT";

const WIZARD_TARGET_FIELDS = KIT_TARGET_FIELDS.map((field) => ({
  key: field.key,
  label: field.label,
  required: ["positionName", "validFrom", "quantity"].includes(field.key),
}));

const TEMPLATE_HEADERS = [
  "Cargo",
  "Inicio da Vigencia",
  "Observacoes da Revisao",
  "SKU do Material",
  "Nome do Material",
  "Tamanho",
  "Quantidade",
  "Periodicidade Dias",
  "Obrigatorio",
];

const TEMPLATE_SAMPLE = [
  "Auxiliar de Obras",
  "2026-05-01",
  "Nova composicao para inverno",
  "UNIF-POLO-AZUL-M",
  "Camisa Polo Azul",
  "M",
  "2",
  "180",
  "SIM",
];

export function KitImportWizard() {
  const [step, setStep] = useState<Step>("UPLOAD");
  const [parsedData, setParsedData] = useState<ParseResult | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState<ImportSummary | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [currentStatus, setCurrentStatus] = useState("");
  const [feedback, setFeedback] = useState<{
    variant: "error" | "warning" | "info";
    message: string;
  } | null>(null);

  function downloadTemplate() {
    const worksheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_SAMPLE]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kits por Cargo");
    const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "template-importacao-kits-por-cargo.xlsx";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await FileParser.parse(file);
      setParsedData(result);
      const columns = result.data[0] ? Object.keys(result.data[0]) : [];
      const suggestedMappings = await getKitMappingSuggestionsAction(columns);
      setMappings(suggestedMappings);
      setFeedback(
        result.errors.length > 0
          ? {
              variant: "warning",
              message: `Arquivo carregado com ${result.errors.length} alerta(s) de parser. Revise o preview antes de importar.`,
            }
          : null,
      );
      setStep("MAPPING");
      toast.success("Arquivo processado. Sugestoes de mapeamento aplicadas.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao processar arquivo.");
    }
  };

  const handleStartValidation = async () => {
    if (!parsedData) return;

    const missing = WIZARD_TARGET_FIELDS.filter(
      (field) => field.required && (!mappings[field.key] || mappings[field.key] === "SKIP"),
    );
    if (missing.length > 0) {
      toast.error(
        `Mapeie os campos obrigatorios: ${missing.map((field) => field.label).join(", ")}`,
      );
      return;
    }

    setStep("VALIDATING");
    setProcessedCount(0);
    setCurrentStatus("Iniciando validacao de revisoes...");

    try {
      const dataRows = parsedData.data;
      setCurrentStatus(`Analisando ${dataRows.length} linha(s) e conflitos entre grupos...`);

      const result = await validateKitImportAction(dataRows, mappings);
      setProcessedCount(dataRows.length);

      setValidationResult({
        total: dataRows.length,
        successCount: result.successCount,
        errorCount: result.errorCount,
        details: result.details,
      });
      setStep("REVIEW");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro durante validacao.");
      setStep("MAPPING");
    }
  };

  const handleStartImport = async () => {
    if (!parsedData) return;

    setStep("IMPORTING");
    setProcessedCount(0);
    setCurrentStatus("Preparando importacao real...");

    try {
      const dataRows = parsedData.data;
      setCurrentStatus(`Persistindo ${dataRows.length} linha(s) respeitando grupos de vigencia...`);

      const result = await importKitsAction(dataRows, mappings);
      setProcessedCount(dataRows.length);

      setSummary({
        total: dataRows.length,
        successCount: result.successCount,
        errorCount: result.errorCount,
        details: result.details,
      });
      setStep("RESULT");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro fatal na importacao.");
      setStep("REVIEW");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {feedback && (
        <OperationFeedback
          title="Feedback operacional"
          message={feedback.message}
          variant={feedback.variant}
        />
      )}

      <div className="mb-8 flex items-center justify-between border-b pb-4">
        <div className="flex flex-wrap gap-4">
          <StepIndicator current={step} target="UPLOAD" label="Upload" />
          <ChevronRight className="h-4 w-4 text-zinc-300" />
          <StepIndicator current={step} target="MAPPING" label="Mapeamento" />
          <ChevronRight className="h-4 w-4 text-zinc-300" />
          <StepIndicator current={step} target="REVIEW" label="Preview e Revisao" />
          <ChevronRight className="h-4 w-4 text-zinc-300" />
          <StepIndicator current={step} target="RESULT" label="Concluir" />
        </div>
      </div>

      {step === "UPLOAD" && (
        <Card className="border-dashed py-12 text-center">
          <CardHeader>
            <FileSpreadsheet className="mx-auto h-12 w-12 text-zinc-400" />
            <CardTitle>Escolha o arquivo de kits por cargo</CardTitle>
            <CardDescription>
              Envie CSV ou Excel para criar ou atualizar revisoes de kit em massa.
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
            <p className="text-xs text-zinc-500">
              Template sugerido: Cargo, Inicio da Vigencia, Observacoes da Revisao, SKU do Material,
              Nome do Material, Tamanho, Quantidade, Periodicidade Dias e Obrigatorio.
            </p>
          </CardContent>
        </Card>
      )}

      {step === "MAPPING" && parsedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configurar mapeamento de colunas
            </CardTitle>
            <CardDescription>
              Relacione o cabecalho da planilha com os campos de revisao e itens do kit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">Campo do sistema</TableHead>
                  <TableHead>Coluna no arquivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {WIZARD_TARGET_FIELDS.map((field) => (
                  <TableRow key={field.key}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {field.label}{" "}
                          {field.required && <span className="text-destructive">*</span>}
                        </span>
                        <Badge
                          variant="outline"
                          className="mt-1 h-4 w-fit px-1 py-0 font-mono text-[9px] text-zinc-400"
                        >
                          {field.key}
                        </Badge>
                      </div>
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900">Preview da planilha</h3>
                <span className="text-xs text-zinc-500">
                  {parsedData.data.length} linha(s) carregada(s)
                </span>
              </div>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader className="bg-zinc-50">
                    <TableRow>
                      {parsedData.data[0] &&
                        Object.keys(parsedData.data[0])
                          .slice(0, 6)
                          .map((column) => <TableHead key={column}>{column}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.data.slice(0, 5).map((row, index) => (
                      <TableRow key={index}>
                        {Object.keys(parsedData.data?.[0] ?? {})
                          .slice(0, 6)
                          .map((column) => (
                            <TableCell key={column} className="text-xs">
                              {String(row[column] ?? "-")}
                            </TableCell>
                          ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="ghost" onClick={() => setStep("UPLOAD")}>
              Voltar
            </Button>
            <Button onClick={handleStartValidation} className="gap-2">
              Validar dados
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {(step === "VALIDATING" || step === "IMPORTING") && (
        <Card className="py-20">
          <CardHeader className="text-center">
            <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <FileSpreadsheet className="text-primary h-6 w-6 animate-bounce" />
            </div>
            <CardTitle>
              {step === "VALIDATING" ? "Validando revisoes" : "Executando importacao"}
            </CardTitle>
            <CardDescription>
              Processando em lotes para garantir integridade, preview seguro e rastreabilidade das
              vigencias.
            </CardDescription>
          </CardHeader>
          <CardContent className="mx-auto max-w-md">
            <ImportProgress
              current={processedCount}
              total={parsedData?.data.length || 0}
              statusText={currentStatus}
              label={step === "VALIDATING" ? "Status da validacao" : "Status do gravamento"}
            />
          </CardContent>
        </Card>
      )}

      {step === "REVIEW" && validationResult && (
        <div className="space-y-6">
          <ImportResultView summary={validationResult} showTitle={false} />

          <Card>
            <CardFooter className="flex flex-col justify-between gap-4 p-6 md:flex-row">
              <Button variant="outline" onClick={() => setStep("MAPPING")}>
                Ajustar mapeamento
              </Button>
              <div className="flex items-center gap-4">
                {validationResult.errorCount > 0 && (
                  <p className="flex items-center gap-2 text-xs font-medium text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    {validationResult.errorCount} falha(s) detectada(s). Grupos com erro serao
                    ignorados.
                  </p>
                )}
                <Button onClick={handleStartImport} className="gap-2 bg-zinc-900 hover:bg-black">
                  Confirmar importacao real
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}

      {step === "RESULT" && summary && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="text-center">
              <div
                className={cn(
                  "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full",
                  summary.errorCount === 0 ? "bg-green-100" : "bg-amber-100",
                )}
              >
                {summary.errorCount === 0 ? (
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                ) : (
                  <ShieldAlert className="h-8 w-8 text-amber-600" />
                )}
              </div>
              <CardTitle className="text-2xl">Importacao concluida</CardTitle>
              <CardDescription>
                O processamento das revisoes de kit por cargo foi finalizado.
              </CardDescription>
            </CardHeader>
          </Card>

          <ImportResultView summary={summary} showTitle />

          <Card>
            <CardFooter className="flex-col gap-3 py-6">
              <Link
                href="/materiais/kits"
                className={cn(buttonVariants({ variant: "default" }), "w-full sm:w-[240px]")}
              >
                Concluir e voltar
              </Link>
              <Link
                href="/materiais/kits/importacao/historico"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2")}
              >
                <History className="h-4 w-4" />
                Ver historico completo
              </Link>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ current, target, label }: { current: Step; target: Step; label: string }) {
  const steps: Step[] = ["UPLOAD", "MAPPING", "VALIDATING", "REVIEW", "IMPORTING", "RESULT"];
  const currentIdx = steps.indexOf(
    current === "VALIDATING" ? "MAPPING" : current === "IMPORTING" ? "REVIEW" : current,
  );
  const targetIdx = steps.indexOf(target);
  const isActive = current === target;
  const isCompleted =
    currentIdx > targetIdx ||
    (current === "RESULT" && target !== "RESULT") ||
    (current === "RESULT" && target === "RESULT");

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs font-bold tracking-wider uppercase",
        isActive ? "text-primary" : "text-zinc-400",
        isCompleted && "text-green-600",
      )}
    >
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full border",
          isActive && "border-primary bg-primary/10",
          isCompleted && "border-green-600 bg-green-50",
        )}
      >
        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : targetIdx + 1}
      </div>
      <span className="hidden lg:inline">{label}</span>
    </div>
  );
}
