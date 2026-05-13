import { ArrowLeft, PackagePlus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { KitTemplateEditor } from "@/components/kits/kit-template-editor";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth-server";
import { cn } from "@/lib/utils";
import { getMaterials } from "@/modules/estoque/services";
import { getKitTemplateById } from "@/modules/kits/templates-services";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function KitTemplateEditorPage({ params }: PageProps) {
  await requirePermission("MANAGE_POSITIONS");
  const { id } = await params;

  const [template, materials] = await Promise.all([getKitTemplateById(id), getMaterials(true)]);

  if (!template) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/materiais/kits/modelos"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para modelos
        </Link>

        <div className="flex items-center gap-4">
          <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl">
            <PackagePlus className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{template.name}</h1>
            <p className="text-muted-foreground">
              {template.description || "Configure os materiais deste modelo de kit."}
            </p>
          </div>
        </div>
      </div>

      <KitTemplateEditor
        templateId={template.id}
        items={template.items}
        materials={materials.map((material) => ({
          id: material.id,
          name: material.name,
          category: material.category,
          unit: material.unit,
          size: material.size,
          sku: material.sku,
        }))}
      />
    </main>
  );
}
