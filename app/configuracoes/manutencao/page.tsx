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

      <Card className="mb-6 border-amber-300">
        <CardHeader>
          <CardTitle>Atenção operacional</CardTitle>
          <CardDescription>
            Estas ações são irreversíveis no uso do sistema e registram auditoria completa.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          A base de funcionários é zerada por inativação para preservar histórico jurídico. O
          estoque é zerado por ajuste sistêmico, sem excluir movimentações anteriores.
        </CardContent>
      </Card>

      <MaintenanceActions />
    </main>
  );
}
