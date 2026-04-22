import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth-server";
import { getMaterials } from "@/modules/estoque/services";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requirePermission("MANAGE_MATERIALS");

  const { searchParams } = new URL(request.url);
  const onlyActive = searchParams.get("onlyActive") === "true";

  return NextResponse.json(await getMaterials(onlyActive));
}
