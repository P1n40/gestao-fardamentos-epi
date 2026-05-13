import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ revisionId?: string }>;
}

export default async function LegacyPositionKitPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { revisionId } = await searchParams;
  const query = revisionId ? `?revisionId=${encodeURIComponent(revisionId)}` : "";

  redirect(`/materiais/kits/${id}${query}`);
}
