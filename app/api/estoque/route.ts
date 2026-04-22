import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth-server";
import { getMaterials, getStockHistory } from "@/modules/estoque/services";

export const dynamic = "force-dynamic";

export async function GET() {
  await requirePermission("MANAGE_MATERIALS");

  const [materials, recentTransactions] = await Promise.all([
    getMaterials(true),
    getStockHistory(undefined, 100),
  ]);

  return NextResponse.json({ materials, recentTransactions });
}
