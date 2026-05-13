import { ArrowLeft, PackagePlus } from "lucide-react";
import Link from "next/link";

import { KitTemplateList } from "@/components/kits/kit-template-list";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth-server";
import { cn } from "@/lib/utils";
import { getKitTemplates } from "@/modules/kits/templates-services";

export default async function KitTemplatesPage() {
  await requirePermission("MANAGE_POSITIONS");
  const templates = await getKitTemplates();

  const items = templates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    active: template.active,
    itemCount: template._count.items,
    linkCount: template._count.links,
  }));

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
            <PackagePlus className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Modelos de Kit</h1>
            <p className="text-muted-foreground">
              Crie kits reutilizáveis antes de vinculá-los aos cargos.
            </p>
          </div>
        </div>
      </div>

      <KitTemplateList templates={items} />
    </main>
  );
}
