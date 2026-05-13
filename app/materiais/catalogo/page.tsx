import { Material } from "@prisma/client";
import { FileSpreadsheet, Package } from "lucide-react";
import Link from "next/link";

import { MaterialImportTemplateButton } from "@/components/materials/material-import-template-button";
import { MaterialList } from "@/components/materials/material-list";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth-server";
import { cn } from "@/lib/utils";
import { getMaterials } from "@/modules/estoque/services";

export default async function CatalogoMateriaisPage() {
  await requirePermission("MANAGE_MATERIALS");

  const materials = (await getMaterials()) as Material[];

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:p-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row">
          <div>
            <div className="text-primary flex items-center gap-2">
              <Package className="h-6 w-6" />
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Catalogo de Materiais
              </h1>
            </div>
            <p className="text-muted-foreground">
              Gerencie o catalogo de fardamentos e equipamentos de protecao individual.
            </p>
          </div>

          <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
            <MaterialImportTemplateButton />
            <Link
              href="/materiais/importacao"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "w-full gap-2 sm:w-auto",
              )}
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
