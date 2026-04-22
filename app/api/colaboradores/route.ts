import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth-server";
import { getEmployees } from "@/modules/colaboradores/services";

export const dynamic = "force-dynamic";

function parseStatus(value: string | null) {
  return value === "active" || value === "inactive" || value === "all" ? value : "all";
}

export async function GET(request: Request) {
  await requirePermission("MANAGE_EMPLOYEES");

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "10");

  const employees = await getEmployees({
    search: searchParams.get("search") || undefined,
    positionId: searchParams.get("position") || undefined,
    status: parseStatus(searchParams.get("status")),
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 10,
  });

  return NextResponse.json(employees);
}
