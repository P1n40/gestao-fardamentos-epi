import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      appEnv: env.APP_ENV,
      nodeEnv: env.NODE_ENV,
      database: "up",
      checkedAt: new Date().toISOString(),
      responseTimeMs: Date.now() - startedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "degraded",
        appEnv: env.APP_ENV,
        nodeEnv: env.NODE_ENV,
        database: "down",
        checkedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Database health check failed",
      },
      { status: 503 },
    );
  }
}
