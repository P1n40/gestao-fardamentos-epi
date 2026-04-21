"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  History,
  Settings2,
  ShieldAlert,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

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
  getMappingSuggestionsAction,
  importEmployeesAction,
  validateImportAction,
} from "@/modules/importacao/actions";
import { FileParser, type ParseResult } from "@/modules/importacao/parser";
import { TARGET_FIELDS } from "@/modules/importacao/pipeline";
import { type ImportDetail, type ImportSummary } from "@/modules/importacao/schemas";

import { ImportProgress } from "./import-progress";
import { ImportResultView } from "./import-result-view";

type Step = "UPLOAD" | "MAPPING" | "VALIDATING" | "REVIEW" | "IMPORTING" | "RESULT";

const WIZARD_TARGET_FIELDS = TARGET_FIELDS.map((f) => ({
  key: f.key,
  label: f.label,
  required: ["name", "documentId", "positionName"].includes(f.key),
}));

export function EmployeeImportWizard() {
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

  // --- Step 1: Upload ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await FileParser.parse(file);
      setParsedData(result);

      // 1. Auto-mapping via Pipeline heuristics (US-53)
      const firstRow = result.data[0];
      const columns = firstRow ? Object.keys(firstRow as object) : [];
      const suggestedMappings = await getMappingSuggestionsAction(columns);

      setMappings(suggestedMappings);
      setFeedback(
        result.errors.length > 0
          ? {
              variant: "warning",
              message: `Arquivo carregado com ${result.errors.length} alerta(s) de parser. Revise antes de importar.`,
            }
          : null,
      );
      setStep("MAPPING");
      toast.success("Arquivo processado. Sugestões de mapeamento aplicadas.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro crítico no parser";
      toast.error(message);
    }
  };

  // --- Step 2: Validation (Dry Run) ---
  const handleStartValidation = async () => {
    if (!parsedData) return;

    const missing = WIZARD_TARGET_FIELDS.filter(
      (f) => f.required && (!mappings[f.key] || mappings[f.key] === "SKIP"),
    );
    if (missing.length > 0) {
      toast.error(`Mapeie os campos obrigatórios: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }

    setStep("VALIDATING");
    setProcessedCount(0);
    setCurrentStatus("Iniciando validação...");

    try {
      const dataRows = parsedData.data;
      const chunkSize = 100;
      let allDetails: ImportDetail[] = [];
      let totalSuccess = 0;
      let totalError = 0;

      for (let i = 0; i < dataRows.length; i += chunkSize) {
        const chunk = dataRows.slice(i, i + chunkSize);
        setCurrentStatus(
          `Analisando registros ${i + 1} a ${Math.min(i + chunkSize, dataRows.length)}...`,
        );

        const result = await validateImportAction(chunk, mappings);

        // Adjust row numbers for the batch
        const adjustedDetails = result.details.map((d) => ({ ...d, row: d.row + i }));
        allDetails = [...allDetails, ...adjustedDetails];
        totalSuccess += result.successCount;
        totalError += result.errorCount;

        setProcessedCount(Math.min(i + chunkSize, dataRows.length));
      }

      setValidationResult({
        total: dataRows.length,
        successCount: totalSuccess,
        errorCount: totalError,
        details: allDetails,
      });
      setStep("REVIEW");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro na validação";
      toast.error(message);
      setStep("MAPPING");
    } finally {
      // End validation
    }
  };
  const handleStartImport = async () => {
    if (!parsedData) return;
    setStep("IMPORTING");
    setProcessedCount(0);
    setCurrentStatus("Preparando importação real...");

    try {
      const dataRows = parsedData.data;
      const chunkSize = 50; // Smaller chunks for real writes
      let allDetails: ImportDetail[] = [];
      let totalSuccess = 0;
      let totalError = 0;

      for (let i = 0; i < dataRows.length; i += chunkSize) {
        const chunk = dataRows.slice(i, i + chunkSize);
        setCurrentStatus(
          `Persistindo registros ${i + 1} a ${Math.min(i + chunkSize, dataRows.length)}...`,
        );

        const result = await importEmployeesAction(chunk, mappings);

        const adjustedDetails = result.details.map((d) => ({ ...d, row: d.row + i }));
        allDetails = [...allDetails, ...adjustedDetails];
        totalSuccess += result.successCount;
        totalError += result.errorCount;

        setProcessedCount(Math.min(i + chunkSize, dataRows.length));
      }

      setSummary({
        total: dataRows.length,
        successCount: totalSuccess,
        errorCount: totalError,
        details: allDetails,
      });
      setStep("RESULT");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro fatal na importação";
      toast.error(message);
      setStep("REVIEW");
    } finally {
      // End import
    }
  };

  // Rendering logic
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {feedback && (
        <OperationFeedback
          title="Feedback operacional"
          message={feedback.message}
          variant={feedback.variant}
        />
      )}
      {/* Stepper Header */}
      <div className="mb-8 flex items-center justify-between border-b pb-4">
        <div className="flex flex-wrap gap-4">
          <StepIndicator current={step} target="UPLOAD" label="Upload" />
          <ChevronRight className="h-4 w-4 text-zinc-300" />
          <StepIndicator current={step} target="MAPPING" label="Mapeamento" />
          <ChevronRight className="h-4 w-4 text-zinc-300" />
          <StepIndicator current={step} target="REVIEW" label="Validação & Revisão" />
          <ChevronRight className="h-4 w-4 text-zinc-300" />
          <StepIndicator current={step} target="RESULT" label="Concluir" />
        </div>
      </div>

      {step === "UPLOAD" && (
        <Card className="border-dashed py-12 text-center">
          <CardHeader>
            <UploadCloud className="mx-auto h-12 w-12 text-zinc-400" />
            <CardTitle>Escolha o arquivo</CardTitle>
            <CardDescription>
              Arraste ou selecione um arquivo CSV ou Excel para importar sua base.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <label className="cursor-pointer">
                <div className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
                  <FileText className="h-4 w-4" />
                  Selecionar Arquivo
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "MAPPING" && parsedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configurar Mapeamento de Colunas
            </CardTitle>
            <CardDescription>
              Relacione o cabeçalho do seu arquivo com os campos do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">Campo do Sistema</TableHead>
                  <TableHead>Coluna no Arquivo</TableHead>
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
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="h-4 px-1 py-0 font-mono text-[9px] text-zinc-400"
                          >
                            {field.key}
                          </Badge>
                          {field.key === "documentId" && (
                            <span className="text-primary text-[9px] font-bold">
                              NORMALIZAÇÃO AUTOMÁTICA
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mappings[field.key] || ""}
                        onValueChange={(val) =>
                          setMappings((m) => ({ ...m, [field.key]: val || "" }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Ignorar campo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SKIP">--- Ignorar ---</SelectItem>
                          {parsedData.data[0] &&
                            Object.keys(parsedData.data[0] as object).map((col) => (
                              <SelectItem key={col} value={col}>
                                {col}
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
            <Button onClick={handleStartValidation} className="gap-2">
              Validar Dados
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
              {step === "VALIDATING" ? "Validando Planilha" : "Executando Importação"}
            </CardTitle>
            <CardDescription>
              Processando em lotes para garantir integridade e auditoria.
            </CardDescription>
          </CardHeader>
          <CardContent className="mx-auto max-w-md">
            <ImportProgress
              current={processedCount}
              total={parsedData?.data.length || 0}
              statusText={currentStatus}
              label={step === "VALIDATING" ? "Status da Validação" : "Status do Gravamento"}
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
                Ajustar Mapeamento
              </Button>

              <div className="flex items-center gap-4">
                {validationResult.errorCount > 0 && (
                  <p className="flex items-center gap-2 text-xs font-medium text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    {validationResult.errorCount} falhas detectadas. Serão ignoradas.
                  </p>
                )}
                <Button onClick={handleStartImport} className="gap-2 bg-zinc-900 hover:bg-black">
                  Confirmar Importação Real
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
              <CardTitle className="text-2xl">Importação Concluída</CardTitle>
              <CardDescription>
                O processamento em lotes foi finalizado com sucesso.
              </CardDescription>
            </CardHeader>
          </Card>

          <ImportResultView summary={summary} showTitle={true} />

          <Card>
            <CardFooter className="flex-col gap-3 py-6">
              <Link
                href="/colaboradores"
                className={cn(buttonVariants({ variant: "default" }), "w-full sm:w-[240px]")}
              >
                Concluir e Voltar
              </Link>
              <Link
                href="/colaboradores/importacao/historico"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2")}
              >
                <History className="h-4 w-4" />
                Ver Histórico Completo
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
