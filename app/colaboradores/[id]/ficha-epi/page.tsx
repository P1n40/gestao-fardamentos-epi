import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardList, Shield } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DocumentActions } from "@/components/entregas/document-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth-server";
import { cn } from "@/lib/utils";
import { auditDocumentReprint, getPpeSheetForReprint } from "@/modules/documentos/services";
import { DocumentVersionQuerySchema } from "@/types/schemas";

interface EmployeePpeSheetPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}

export default async function EmployeePpeSheetPage({
  params,
  searchParams,
}: EmployeePpeSheetPageProps) {
  const { id } = await params;
  const rawSearchParams = await searchParams;
  const parsedQuery = DocumentVersionQuerySchema.safeParse(rawSearchParams);

  if (!parsedQuery.success) {
    notFound();
  }

  const session = await requirePermission("MANAGE_DELIVERIES");

  const sheet = await getPpeSheetForReprint({
    employeeId: id,
    version: parsedQuery.data.version,
  }).catch(() => null);

  if (!sheet) {
    notFound();
  }

  const { employee, assignments, document, latestDocument, availableVersions } = sheet;
  const targetVersion = document?.version ?? latestDocument?.version ?? 1;
  const issuedAt = document?.issuedAt ?? latestDocument?.issuedAt ?? new Date();

  await auditDocumentReprint({
    userId: session.user.id,
    type: "PPE",
    documentId: document?.id ?? latestDocument?.id,
    employeeId: employee.id,
    version: targetVersion,
    source: "PPE_SHEET_PAGE",
  });

  return (
    <main className="min-h-screen bg-zinc-50 p-4 md:p-8 print:bg-white print:p-0">
      <div className="mx-auto mb-8 flex max-w-4xl items-center justify-between rounded-lg border bg-white p-4 shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <ClipboardList className="text-primary h-5 w-5" />
          <div>
            <h1 className="font-semibold">Ficha de Equipamentos de Proteção (EPI)</h1>
            <p className="text-xs text-zinc-500">
              Reimpressão da versão histórica acumulativa do colaborador.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DocumentActions
            elementId="ppe-sheet-content"
            filename={`ficha-epi-${employee.documentId}-v${targetVersion}-${format(issuedAt, "yyyy-MM-dd")}`}
          />
        </div>
      </div>

      <div className="mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Versões disponíveis
          </span>
          {availableVersions.length > 0 ? (
            availableVersions.map((versionItem) => {
              const isActive = versionItem.version === targetVersion;

              return (
                <Link
                  key={versionItem.id}
                  href={`/colaboradores/${employee.id}/ficha-epi?version=${versionItem.version}`}
                  className={cn(
                    buttonVariants({ variant: isActive ? "default" : "outline", size: "sm" }),
                    "h-8",
                  )}
                >
                  v{versionItem.version}
                </Link>
              );
            })
          ) : (
            <Badge variant="outline">Sem versões emitidas</Badge>
          )}
        </div>

        {latestDocument && targetVersion !== latestDocument.version && (
          <Link
            href={`/colaboradores/${employee.id}/ficha-epi`}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Voltar para a versão atual
          </Link>
        )}
      </div>

      <div
        id="ppe-sheet-content"
        className="mx-auto flex min-h-[297mm] max-w-[210mm] flex-col border bg-white p-[15mm] shadow-lg print:border-none print:shadow-none"
      >
        <div className="mb-6 flex items-start justify-between border-b pb-6 text-[11px]">
          <div className="flex flex-col gap-1">
            <Image src="/logo.png" alt="Logo da Empresa" width={180} height={65} className="mb-3" />
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 uppercase">
              Ficha de Controle e Entrega de EPI
            </h2>
            <p className="muted-foreground text-[10px] uppercase">
              Em conformidade com a Norma Regulamentadora NR-6 (Portaria 3.214/78)
            </p>
          </div>
          <div className="flex flex-col items-end text-right">
            <Shield className="mb-1 h-8 w-8 text-zinc-200" />
            <div className="text-[8px] leading-tight tracking-widest text-zinc-400 uppercase">
              Doc ID: {(document?.id ?? latestDocument?.id ?? "N/A").toUpperCase()}
              <br />
              Versão V{targetVersion}
              <br />
              Pág. 01 / 01
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-zinc-200 p-4">
          <h3 className="mb-3 text-[9px] font-bold tracking-widest text-zinc-400 uppercase">
            Identificação do Colaborador
          </h3>
          <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <div className="col-span-2">
              <p className="text-[9px] font-bold text-zinc-500 uppercase">Nome do Funcionário</p>
              <p className="font-bold text-zinc-900 uppercase">{employee.name}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-zinc-500 uppercase">Documento / CPF</p>
              <p className="font-semibold">{employee.documentId}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-zinc-500 uppercase">Cargo / Função</p>
              <p className="font-semibold">{employee.position.name}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-zinc-500 uppercase">Matrícula</p>
              <p className="font-semibold">{employee.registrationCode || "N/A"}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-zinc-500 uppercase">Setor / Secretaria</p>
              <p className="font-semibold uppercase">
                {employee.department || "ADMITIDO EM GERAL"}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8 flex-1">
          <h3 className="mb-3 text-[9px] font-bold tracking-widest text-zinc-400 uppercase">
            Histórico de Fornecimento de EPI
          </h3>
          <table className="w-full border-collapse border text-[10px]">
            <thead className="bg-zinc-50">
              <tr>
                <th className="border p-2 text-center font-bold uppercase">Data</th>
                <th className="border p-2 text-left font-bold uppercase">
                  Descritivo do Equipamento (EPI)
                </th>
                <th className="border p-2 text-center font-bold uppercase">C.A.</th>
                <th className="border p-2 text-center font-bold uppercase">Qtd</th>
                <th className="border p-2 text-center font-bold uppercase">Devolvido</th>
                <th className="border p-2 text-left font-bold uppercase">Assinatura / Visto</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length > 0 ? (
                assignments.map((assignment) => (
                  <tr key={assignment.id} className="h-10">
                    <td className="border px-2 text-center font-mono">
                      {format(new Date(assignment.issuedAt), "dd/MM/yy")}
                    </td>
                    <td className="border px-2 lowercase first-letter:uppercase">
                      <p className="font-bold tracking-tight uppercase">
                        {assignment.material.name}
                      </p>
                      {assignment.isReplacement && (
                        <span className="text-[8px] text-zinc-500 italic">[Substituição]</span>
                      )}
                    </td>
                    <td className="border px-2 text-center font-mono font-bold">
                      {assignment.caNumber || "—"}
                    </td>
                    <td className="border px-2 text-center">
                      {assignment.quantity} {assignment.material.unit}
                    </td>
                    <td className="border px-2 text-center text-zinc-300 italic">
                      {assignment.returnedAt
                        ? format(new Date(assignment.returnedAt), "dd/MM/yy")
                        : "— / — / —"}
                    </td>
                    <td className="border px-2">
                      <div className="mb-1 h-4 border-b border-dashed border-zinc-100" />
                      {assignment.deliveryItem?.delivery ? (
                        <div className="text-right text-[6px] text-zinc-300 uppercase">
                          <p>Entrega: {assignment.deliveryItem.delivery.id.slice(-6)}</p>
                          <p>Op: {assignment.deliveryItem.delivery.user.name}</p>
                        </div>
                      ) : (
                        <p className="text-right text-[7px] text-zinc-400 uppercase">
                          Lançado via Sistema
                        </p>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="h-20">
                  <td colSpan={6} className="border text-center text-zinc-400 italic">
                    Nenhum registro de EPI encontrado para esta versão da ficha.
                  </td>
                </tr>
              )}
              {Array.from({ length: Math.max(0, 15 - assignments.length) }).map((_, index) => (
                <tr key={`blank-${index}`} className="h-10">
                  <td className="border px-2" />
                  <td className="border px-2" />
                  <td className="border px-2" />
                  <td className="border px-2" />
                  <td className="border px-2" />
                  <td className="border px-2" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-8 rounded-lg border bg-zinc-50/30 p-4 text-justify text-[9px] leading-relaxed text-zinc-600">
          <p className="mb-2 text-center font-bold tracking-wider text-zinc-900 uppercase">
            Declaração de Responsabilidade e Termo de Recebimento
          </p>
          <p>
            Declaro para os devidos fins que recebi os Equipamentos de Proteção Individual (EPI)
            relacionados nesta ficha, os quais foram entregues para meu uso obrigatório, conforme
            determina a Norma Regulamentadora nº 06, do Ministério do Trabalho e Emprego.
            Comprometo-me a: <strong>1)</strong> Utilizar os equipamentos apenas para a finalidade a
            que se destinam; <strong>2)</strong> Responsabilizar-me pela guarda e conservação;{" "}
            <strong>3)</strong> Comunicar à empresa qualquer alteração que o torne impróprio para
            uso; <strong>4)</strong> Devolver o equipamento ao almoxarifado no ato do desligamento
            ou quando da sua substituição. Declaro ainda ter recebido treinamento adequado sobre o
            uso dos equipamentos ora entregues.
          </p>
        </div>

        <div className="mt-auto">
          <div className="flex items-end justify-between gap-12 border-t border-zinc-200 pt-8">
            <div className="flex-1 text-center">
              <div className="w-full border-t border-zinc-900 pt-1">
                <p className="text-[10px] font-bold uppercase">{employee.name}</p>
                <p className="text-[8px] text-zinc-400">Assinatura do Colaborador</p>
              </div>
            </div>

            <div className="flex-none px-4 text-center">
              <p className="text-[10px] font-bold uppercase">
                {format(new Date(issuedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <p className="text-[8px] text-zinc-400">Data de Emissão da Ficha</p>
            </div>

            <div className="flex-1 text-center">
              <div className="w-full border-t border-zinc-900 pt-1">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Responsável / SESMT</p>
                <p className="text-[8px] text-zinc-400">Carimbo e Assinatura</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between border-t pt-2 text-[7px] tracking-widest text-zinc-300 uppercase">
            <p>SGEP — Sistema de Gestão de Fardamento e EPI (Versão 1.0)</p>
            <p>
              Hash de Verificação: {(document?.hash ?? latestDocument?.hash ?? "N/A").toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
