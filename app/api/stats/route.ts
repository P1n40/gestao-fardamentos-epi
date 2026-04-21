import { NextResponse } from "next/server";

import { checkApiAuth } from "@/lib/auth-server";
import { getDashboardData } from "@/modules/dashboard/services";
import { DashboardFiltersSchema } from "@/types/schemas";

/**
 * Endpoint for dashboard highlights.
 * Requires VIEW_DASHBOARD permission.
 */
export async function GET(request: Request) {
  const auth = await checkApiAuth("VIEW_DASHBOARD");

  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const parsedFilters = DashboardFiltersSchema.safeParse({
      department: searchParams.get("department") || undefined,
      positionId: searchParams.get("positionId") || undefined,
      period: searchParams.get("period") || undefined,
    });
    const filters = parsedFilters.success
      ? parsedFilters.data
      : DashboardFiltersSchema.parse({});

    const data = await getDashboardData(filters);

    return NextResponse.json({
      filters: data.filters,
      employees: data.metrics.activeEmployees.value,
      pendingEmployees: data.metrics.pendingEmployees.value,
      criticalStockItems: data.metrics.criticalStockItems.value,
      deliveriesThisMonth: data.metrics.deliveriesThisMonth.value,
      deliveryBreakdown: data.deliveryBreakdown,
      generatedAt: data.generatedAt,
    });
  } catch (error) {
    console.error("API Stats error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
