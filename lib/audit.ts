import { Prisma } from "@prisma/client";
import { headers } from "next/headers";

import prisma from "./prisma";

interface AuditParams {
  userId?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  details?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

/**
 * Persists an audit log entry.
 * Now captures IP and User Agent automatically from headers if available.
 */
export async function logAudit({
  userId,
  action,
  entity,
  entityId,
  details,
  oldValue,
  newValue,
  metadata,
}: AuditParams) {
  let ipAddress: string | undefined;
  let userAgent: string | undefined;

  try {
    const headersList = await headers();
    ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || undefined;
    userAgent = headersList.get("user-agent") || undefined;
  } catch {
    // Headers might not be available in all contexts (e.g. background jobs)
  }

  return await prisma.auditLog.create({
    data: {
      userId: userId || null,
      action,
      entity: entity || null,
      entityId: entityId || null,
      details: details || null,
      oldValue: toPrismaJson(oldValue),
      newValue: toPrismaJson(newValue),
      metadata: toPrismaJson(metadata),
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    },
  });
}
