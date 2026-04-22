import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth-server";
import { getDeliveries } from "@/modules/entregas/services";

export const dynamic = "force-dynamic";

function parseType(value: string | null) {
  return value === "UNIFORM" || value === "PPE" ? value : undefined;
}

export async function GET(request: Request) {
  await requirePermission("MANAGE_DELIVERIES");

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "50");

  const deliveries = await getDeliveries({
    type: parseType(searchParams.get("type")),
    limit: Number.isFinite(limit) ? limit : 50,
  });

  return NextResponse.json(deliveries);
}
