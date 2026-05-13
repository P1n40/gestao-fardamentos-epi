import { ArrowLeft, FileSpreadsheet, History } from "lucide-react";
import Link from "next/link";

import { KitTemplateImportWizard } from "@/components/importacao/kit-template-import-wizard";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth-server";
import { cn } from "@/lib/utils";

export default async function MaterialKitImportPage() {
  await requirePermission("MANAGE_POSITIONS");

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:p-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <Link
            href="/materiais/kits"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para kits
          </Link>

          <Link
            href="/materiais/kits/importacao/historico"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
          >
            <History className="h-4 w-4" />
            Ver histórico
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Importação de Modelos de Kit</h1>
            <p className="text-muted-foreground">
              Crie ou atualize modelos reutilizáveis e seus itens a partir de uma planilha.
            </p>
          </div>
        </div>
      </div>

      <KitTemplateImportWizard />
    </main>
  );
}
