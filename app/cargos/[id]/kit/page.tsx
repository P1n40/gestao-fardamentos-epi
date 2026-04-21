import { ArrowLeft, Briefcase } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { KitManager, KitRevision, Material as KitMaterial } from "@/components/kits/kit-manager";
import { requirePermission } from "@/lib/auth-server";
import { getMaterials } from "@/modules/estoque/services";
import { getRevisionsByPosition, getRevisionById } from "@/modules/kits/services";
import { getPositionById } from "@/modules/posicoes/services";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ revisionId?: string }>;
}

export default async function PositionKitPage({ params, searchParams }: PageProps) {
  await requirePermission("MANAGE_POSITIONS");

  const { id } = await params;
  const { revisionId } = await searchParams;

  const [position, revisions, availableMaterials] = await Promise.all([
    getPositionById(id),
    getRevisionsByPosition(id),
    getMaterials(true),
  ]);

  if (!position) {
    notFound();
  }

  // Determine which revision to show
  let selectedRevisionId = revisionId;
  if (!selectedRevisionId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const active = revisions.find((r: any) => r.isActive);
    selectedRevisionId = active?.id || revisions[0]?.id;
  }

  const selectedRevision = selectedRevisionId ? await getRevisionById(selectedRevisionId) : null;

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/cargos"
          className="text-muted-foreground hover:text-primary flex items-center text-sm transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Cargos
        </Link>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-lg p-2">
              <Briefcase className="text-primary h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Kits por Cargo: {position.name}</h1>
              <p className="text-muted-foreground">
                Gerencie o versionamento e vigência dos materiais para este cargo.
              </p>
            </div>
          </div>
        </div>
      </div>

      <KitManager
        positionId={id}
        positionName={position.name}
        requiresUniform={position.requiresUniform}
        requiresPPE={position.requiresPPE}
        currentRevision={selectedRevision as unknown as KitRevision}
        revisions={revisions as unknown as KitRevision[]}
        availableMaterials={availableMaterials as unknown as KitMaterial[]}
      />
    </main>
  );
}
