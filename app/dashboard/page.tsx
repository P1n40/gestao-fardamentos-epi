import type { Metadata } from "next";

import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { requirePermission } from "@/lib/auth-server";
import { getDashboardData, getDashboardFilterOptions } from "@/modules/dashboard/services";
import { DashboardFiltersSchema } from "@/types/schemas";

export const metadata: Metadata = {
  title: "Dashboard | Sistema de Fardamentos",
  description: "Indicadores principais de ativos, pendencias, estoque critico e entregas.",
};

function getSingleQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

interface DashboardPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  await requirePermission("VIEW_DASHBOARD");

  const rawParams = await searchParams;
  const parsedFilters = DashboardFiltersSchema.safeParse({
    department: getSingleQueryValue(rawParams.department),
    positionId: getSingleQueryValue(rawParams.positionId),
    period: getSingleQueryValue(rawParams.period),
  });

  const filters = parsedFilters.success ? parsedFilters.data : DashboardFiltersSchema.parse({});

  const [data, filterOptions] = await Promise.all([
    getDashboardData(filters),
    getDashboardFilterOptions(),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <DashboardOverview data={data} filterOptions={filterOptions} />
    </main>
  );
}
