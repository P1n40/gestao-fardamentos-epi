import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Shield } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DocumentActions } from "@/components/entregas/document-actions";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth-server";
import { cn } from "@/lib/utils";
import { auditDocumentReprint, getReceiptForReprint } from "@/modules/documentos/services";

interface ReceiptPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { id } = await params;
  const session = await requirePermission("MANAGE_DELIVERIES");

  const delivery = await getReceiptForReprint(id).catch(() => null);

  if (!delivery) {
    notFound();
  }

  const isUniform = delivery.type === "UNIFORM";

  await auditDocumentReprint({
    userId: session.user.id,
    type: delivery.type,
    documentId: delivery.document?.id,
    deliveryId: delivery.id,
    employeeId: delivery.employeeId,
    version: delivery.document?.version,
    source: "RECEIPT_PAGE",
  });

  return (
    <main className="min-h-screen bg-zinc-50 p-4 md:p-8 print:bg-white print:p-0">
      <div className="mx-auto mb-8 flex max-w-4xl items-center justify-between rounded-lg border bg-white p-4 shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <Shield className="text-primary h-5 w-5" />
          <div>
            <h1 className="font-semibold">
              {isUniform ? "ReimpressÃ£o de Recibo" : "Comprovante vinculado Ã  entrega"}
            </h1>
            <p className="text-xs text-zinc-500">
              {isUniform
                ? "Documento pontual da entrega de fardamento."
                : "Para histÃ³rico completo de EPI, use a ficha versionada do colaborador."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isUniform && delivery.document && (
            <Link
              href={`/colaboradores/${delivery.employeeId}/ficha-epi?version=${delivery.document.version}`}
              target="_blank"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
            >
              <FileText className="h-4 w-4" />
              Abrir Ficha EPI v{delivery.document.version}
            </Link>
          )}
          <DocumentActions
            elementId="receipt-content"
            filename={`${isUniform ? "recibo" : "comprovante"}-${delivery.type}-${delivery.id.slice(-8)}`}
          />
        </div>
      </div>

      <div
        id="receipt-content"
        className="mx-auto flex min-h-[297mm] max-w-[210mm] flex-col border bg-white p-[20mm] shadow-lg print:border-none print:shadow-none"
      >
        <div className="mb-8 flex items-start justify-between border-b pb-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold tracking-tight uppercase">
              {isUniform ? "Recibo de Entrega de Fardamento" : "Comprovante de Entrega de EPI"}
            </h2>
            <p className="muted-foreground text-xs">
              Sistema de GestÃ£o de Fardamentos e EPI â€” Controle de Almoxarifado
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold">NÂº {delivery.id.slice(-8).toUpperCase()}</div>
            <div className="muted-foreground text-[10px] uppercase">
              {delivery.document && (
                <div className="mb-1 text-[8px] tracking-widest text-zinc-400">
                  Doc ID: {delivery.document.id.toUpperCase()} (v{delivery.document.version})
                </div>
              )}
              Emitido em:{" "}
              {format(new Date(delivery.issuedAt), "dd/MM/yyyy HH:mm", {
                locale: ptBR,
              })}
            </div>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-8 border-b pb-6 text-[11px]">
          <div>
            <p className="mb-1 font-bold text-zinc-400 uppercase">Empresa / Unidade</p>
            <p className="font-semibold">PREFEITURA MUNICIPAL â€” GESTÃƒO OPERACIONAL</p>
            <p>Rua Exemplo, 123 â€” Centro</p>
            <p>Cidade Modelo â€” UF</p>
          </div>
          <div className="text-right">
            <p className="mb-1 font-bold text-zinc-400 uppercase">IdentificaÃ§Ã£o do Evento</p>
            <p>
              Categoria:{" "}
              <span className="font-bold">
                {isUniform ? "UNIFORME / VESTUÃRIO" : "EQUIPAMENTO DE PROTEÃ‡ÃƒO"}
              </span>
            </p>
            <p>
              Tipo de MovimentaÃ§Ã£o: <span className="font-bold">ENTREGA DIRETA</span>
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-lg border bg-zinc-50/50 p-6">
          <h3 className="mb-4 text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
            Dados do Colaborador
          </h3>
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase">Nome Completo</p>
              <p className="font-semibold">{delivery.employee.name}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase">CPF / Documento</p>
              <p className="font-semibold">{delivery.employee.documentId}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase">MatrÃ­cula</p>
              <p className="font-semibold">{delivery.employee.registrationCode || "N/A"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase">Cargo / FunÃ§Ã£o</p>
              <p className="font-semibold">{delivery.employee.position.name}</p>
            </div>
          </div>
        </div>

        <div className="mb-8 flex-1">
          <h3 className="mb-4 text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
            Materiais Entregues
          </h3>
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-zinc-200">
                <th className="py-2 pr-4 text-[10px] font-bold uppercase">CÃ³d</th>
                <th className="py-2 pr-4 text-[10px] font-bold uppercase">DescriÃ§Ã£o do Material</th>
                <th className="py-2 pr-4 text-center text-[10px] font-bold uppercase">Tam.</th>
                <th className="py-2 pr-4 text-center text-[10px] font-bold uppercase">Qtd</th>
                <th className="py-2 pr-4 text-center text-[10px] font-bold uppercase">C.A.</th>
                <th className="py-2 text-right text-[10px] font-bold uppercase">CondiÃ§Ã£o</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {delivery.items.map((item, index) => (
                <tr key={item.id} className="text-zinc-700">
                  <td className="py-3 pr-4 font-mono text-[10px]">{index + 1}</td>
                  <td className="py-3 pr-4">
                    <p className="font-bold">{item.material.name}</p>
                    {item.material.sku && (
                      <p className="text-muted-foreground text-[9px]">SKU: {item.material.sku}</p>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-center">{item.material.size || "â€”"}</td>
                  <td className="py-3 pr-4 text-center font-bold">{item.quantity}</td>
                  <td className="py-3 pr-4 text-center font-mono text-[10px]">
                    {item.caNumber || "â€”"}
                  </td>
                  <td className="py-3 text-right">
                    <span className="rounded border px-2 py-0.5 text-[9px] font-bold uppercase">
                      {item.isReplacement ? "SubstituiÃ§Ã£o" : "Novo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-12 border-t pt-6 text-justify text-[10px] leading-relaxed text-zinc-600">
          {isUniform ? (
            <p>
              Declaro que recebi os uniformes acima descritos, os quais sÃ£o de propriedade da
              Empresa/Prefeitura, e me comprometo a utilizÃ¡-los exclusivamente para o exercÃ­cio de
              minhas funÃ§Ãµes profissionais. Comprometo-me ainda a zelar pela guarda e conservaÃ§Ã£o
              dos mesmos, estando ciente de que o extravio ou dano por mau uso poderÃ¡ acarretar
              descontos em folha de pagamento, conforme legislaÃ§Ã£o vigente. Em caso de desligamento,
              comprometo-me a realizar a devoluÃ§Ã£o imediata dos itens.
            </p>
          ) : (
            <p>
              Declaro que recebi o Equipamento de ProteÃ§Ã£o Individual (EPI) acima descrito, estando
              devidamente treinado e orientado quanto ao seu uso correto e conservaÃ§Ã£o.
              Comprometo-me a utilizÃ¡-lo ininterruptamente durante as atividades de risco, a
              solicitar sua substituiÃ§Ã£o quando danificado e a devolvÃª-lo ao almoxarifado no ato do
              desligamento ou mudanÃ§a de funÃ§Ã£o. Declaro ainda estar ciente de que o nÃ£o uso do EPI
              configura infraÃ§Ã£o passÃ­vel de sanÃ§Ãµes disciplinares.
            </p>
          )}
        </div>

        <div className="mt-auto pt-12">
          <div className="mb-12 flex justify-between gap-12">
            <div className="flex-1 text-center">
              <div className="border-t border-zinc-400 pt-2">
                <p className="text-xs font-bold uppercase">{delivery.employee.name}</p>
                <p className="text-muted-foreground text-[10px] uppercase">
                  {delivery.employee.documentId}
                </p>
                <p className="mt-1 text-[9px] font-bold tracking-widest text-zinc-300">
                  ASSINATURA DO COLABORADOR
                </p>
              </div>
            </div>
            <div className="flex-1 text-center">
              <div className="border-t border-zinc-400 pt-2">
                <p className="text-xs font-bold uppercase">{delivery.user.name}</p>
                <p className="text-muted-foreground text-[10px] uppercase">
                  {delivery.user.id.slice(-8).toUpperCase()}
                </p>
                <p className="mt-1 text-[9px] font-bold tracking-widest text-zinc-300">
                  RESPONSÃVEL PELA ENTREGA
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[8px] tracking-widest text-zinc-400 uppercase">
            <p>Gerado via Sistema de GestÃ£o de Fardamentos e EPI</p>
            <p>ID TransaÃ§Ã£o: {delivery.id}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
