import { ArrowLeft, History } from "lucide-react";
import Link from "next/link";

import { ImportHistoryList } from "@/components/importacao/import-history-list";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth-server";
import { cn } from "@/lib/utils";
import { getRecentImportLogs } from "@/modules/importacao/get-logs";

export default async function ImportHistoryPage() {
  await requirePermission("MANAGE_EMPLOYEES");
  const logs = await getRecentImportLogs();

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/colaboradores/importacao"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para importação
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Histórico de Importações</h1>
            <p className="text-muted-foreground">
              Rastreabilidade detalhada dos lotes processados e alterações realizadas.
            </p>
          </div>
        </div>
      </div>

      <ImportHistoryList logs={logs} />
    </main>
  );
}
