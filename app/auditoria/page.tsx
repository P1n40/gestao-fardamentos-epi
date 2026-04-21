import { History, ShieldCheck } from "lucide-react";

import { AuditLogItem, AuditLogsTable } from "@/components/auditoria/audit-logs-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth-server";
import { getAuditLogs } from "@/modules/auditoria/services";

export const metadata = {
  title: "Auditoria | Gestão de Fardamento e EPI",
  description: "Trilha de auditoria das ações críticas do sistema",
};

export default async function AuditPage() {
  await requirePermission("VIEW_AUDIT_LOGS");

  const { logs } = await getAuditLogs({ limit: 100 });

  return (
    <main className="mx-auto max-w-7xl p-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trilha de Auditoria</h1>
            <p className="text-muted-foreground flex items-center gap-1 text-sm italic">
              <ShieldCheck className="h-3 w-3" />
              Sendo gravada em conformidade com as diretrizes de integridade operacional.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Ações Críticas</CardTitle>
            <CardDescription>
              Acompanhamento de alterações em colaboradores, estoque, documentos e acessos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuditLogsTable logs={logs as unknown as AuditLogItem[]} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
