import { ArrowLeft, Link2 } from "lucide-react";
import Link from "next/link";

import { KitTemplateLinker } from "@/components/kits/kit-template-linker";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth-server";
import { cn } from "@/lib/utils";
import { getActiveKitTemplates } from "@/modules/kits/templates-services";
import { getPositions } from "@/modules/posicoes/services";

export default async function LinkKitTemplatePage() {
  await requirePermission("MANAGE_POSITIONS");

  const [templates, positions] = await Promise.all([getActiveKitTemplates(), getPositions()]);

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/materiais/kits"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para kits
        </Link>

        <div className="flex items-center gap-4">
          <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl">
            <Link2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vincular Modelo a Cargo</h1>
            <p className="text-muted-foreground">
              Crie uma revisão rascunho para um cargo copiando os itens de um modelo.
            </p>
          </div>
        </div>
      </div>

      <KitTemplateLinker
        templates={templates.map((template) => ({
          id: template.id,
          name: template.name,
          items: template.items.map((item) => ({ id: item.id })),
        }))}
        positions={positions.map((position) => ({
          id: position.id,
          name: position.name,
          active: position.active,
        }))}
      />
    </main>
  );
}
