import { Briefcase, FileSpreadsheet } from "lucide-react";
import Link from "next/link";

import { PositionList } from "@/components/positions/position-list";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth-server";
import { cn } from "@/lib/utils";
import { getPositions } from "@/modules/posicoes/services";

export default async function CargosPage() {
  await requirePermission("MANAGE_POSITIONS");

  const positions = await getPositions();

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="text-primary flex items-center gap-2">
              <Briefcase className="h-6 w-6" />
              <h1 className="text-3xl font-bold tracking-tight">Gestao de Cargos</h1>
            </div>
            <p className="text-muted-foreground">
              Cadastre e gerencie os cargos da empresa para vincular kits de fardamento e EPI.
            </p>
          </div>

          <Link
            href="/materiais/kits/importacao"
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Importar kits em massa
          </Link>
        </div>
      </div>

      <PositionList initialPositions={positions} />
    </main>
  );
}
