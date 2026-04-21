import { Material } from "@prisma/client";
import { FileSpreadsheet, Package } from "lucide-react";
import Link from "next/link";

import { MaterialImportTemplateButton } from "@/components/materials/material-import-template-button";
import { MaterialList } from "@/components/materials/material-list";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth-server";
import { cn } from "@/lib/utils";
import { getMaterials } from "@/modules/estoque/services";

export default async function MateriaisPage() {
  await requirePermission("MANAGE_MATERIALS");

  const materials = (await getMaterials()) as Material[];

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-primary flex items-center gap-2">
              <Package className="h-6 w-6" />
              <h1 className="text-3xl font-bold tracking-tight">Catalogo de Materiais</h1>
            </div>
            <p className="text-muted-foreground">
              Gerencie o catalogo de fardamentos e equipamentos de protecao individual.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <MaterialImportTemplateButton />
            <Link
              href="/materiais/importacao"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Importar materiais
            </Link>
          </div>
        </div>
      </div>

      <MaterialList initialMaterials={materials} />
    </main>
  );
}
