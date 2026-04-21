import { ArrowLeft, FileSpreadsheet, History } from "lucide-react";
import Link from "next/link";

import { EmployeeImportWizard } from "@/components/importacao/employee-import-wizard";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth-server";
import { cn } from "@/lib/utils";

export default async function ImportacaoColaboradoresPage() {
  await requirePermission("MANAGE_EMPLOYEES");

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <Link
            href="/colaboradores"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para lista
          </Link>

          <Link
            href="/colaboradores/importacao/historico"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
          >
            <History className="h-4 w-4" />
            Ver Histórico
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Importação de Base</h1>
            <p className="text-muted-foreground">
              Carregue ou sincronize sua base de colaboradores via CSV ou Excel.
            </p>
          </div>
        </div>
      </div>

      <EmployeeImportWizard />
    </main>
  );
}
