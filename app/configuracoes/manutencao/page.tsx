import { AlertTriangle } from "lucide-react";
import { MaintenanceActions } from "@/components/configuracoes/maintenance-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth-server";

export default async function MaintenancePage() {
  await requirePermission("MANAGE_SYSTEM_MAINTENANCE");

  return (
    <main className="mx-auto max-w-7xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Manutenção do Sistema</h1>
        <p className="text-muted-foreground">
          Ações críticas exigem permissão explícita, motivo e confirmação textual.
        </p>
      </div>

      <Card className="mb-6 border-2 border-amber-500 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Atenção operacional
          </CardTitle>
          <CardDescription className="text-amber-800">
            Estas ações são irreversíveis no uso do sistema e registram auditoria completa.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-amber-900 text-sm">
          A base de funcionários é zerada por inativação para preservar histórico jurídico. O
          estoque é zerado por ajuste sistêmico, sem excluir movimentações anteriores.
        </CardContent>
      </Card>

      <MaintenanceActions />
    </main>
  );
}
