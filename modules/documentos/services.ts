import crypto from "crypto";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import prisma from "@/lib/prisma";
import { DocumentSchema, DocumentVersionQuerySchema } from "@/types/schemas";

export type CreateDocumentData = z.infer<typeof DocumentSchema>;

export function resolveNextDocumentVersion(params: {
  type: "UNIFORM" | "PPE";
  requestedVersion?: number | null;
  latestVersion?: number | null;
}) {
  const { type, requestedVersion, latestVersion } = params;

  if (type === "PPE") {
    return latestVersion ? latestVersion + 1 : 1;
  }

  return requestedVersion || 1;
}

export function buildDocumentHash(metadata: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(metadata || {})).digest("hex");
}

export function filterAssignmentsForDocumentDate<T extends { issuedAt: Date }>(
  assignments: T[],
  issuedAt?: Date | null,
) {
  if (!issuedAt) {
    return assignments;
  }

  return assignments.filter((assignment) => assignment.issuedAt <= issuedAt);
}

export async function registerDocument(data: CreateDocumentData, userId: string, tx?: any) {
  const client = tx || prisma;

  let version = data.version || 1;

  if (data.type === "PPE") {
    const latestDoc = await client.document.findFirst({
      where: { employeeId: data.employeeId, type: "PPE" },
      orderBy: { version: "desc" },
    });
    version = resolveNextDocumentVersion({
      type: data.type,
      requestedVersion: data.version,
      latestVersion: latestDoc?.version,
    });
  }

  const hash = data.hash || buildDocumentHash(data.metadata || {});

  const document = await client.document.create({
    data: {
      type: data.type,
      employeeId: data.employeeId,
      deliveryId: data.deliveryId,
      version,
      fileKey: data.fileKey,
      hash,
      metadata: data.metadata || {},
      userId,
    },
  });

  if (data.deliveryId) {
    await client.delivery.update({
      where: { id: data.deliveryId },
      data: { receiptUrl: document.id },
    });
  }

  await logAudit({
    userId,
    action: "GENERATE",
    entity: "Document",
    entityId: document.id,
    details: `Gerado documento de ${data.type} v${version}`,
    metadata: { hash, employeeId: data.employeeId, deliveryId: data.deliveryId },
  });

  return document;
}

export async function getDocumentById(id: string) {
  return await prisma.document.findUnique({
    where: { id },
    include: {
      employee: { include: { position: true } },
      delivery: true,
    },
  });
}

export async function getDocumentsByEmployee(employeeId: string, type?: "UNIFORM" | "PPE") {
  return await prisma.document.findMany({
    where: {
      employeeId,
      type,
    },
    orderBy: { version: "desc" },
  });
}

const DocumentLookupSchema = z.object({
  employeeId: z.string().min(1),
  version: DocumentVersionQuerySchema.shape.version,
});

const ReceiptLookupSchema = z.object({
  deliveryId: z.string().min(1),
});

export async function getReceiptForReprint(deliveryId: string) {
  const parsed = ReceiptLookupSchema.safeParse({ deliveryId });
  if (!parsed.success) {
    throw new Error("Identificador de entrega invalido para reimpressao.");
  }

  const delivery = await prisma.delivery.findUnique({
    where: { id: parsed.data.deliveryId },
    include: {
      employee: {
        include: { position: true },
      },
      user: true,
      document: true,
      items: {
        include: {
          material: true,
          assignment: true,
        },
      },
    },
  });

  if (!delivery) {
    throw new Error("Entrega nao encontrada.");
  }

  return delivery;
}

export async function getPpeSheetForReprint(input: { employeeId: string; version?: number }) {
  const parsed = DocumentLookupSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Parametros invalidos para consulta da ficha de EPI.");
  }

  const { employeeId, version } = parsed.data;

  const [employee, documents, assignments] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId },
      include: { position: true },
    }),
    prisma.document.findMany({
      where: { employeeId, type: "PPE" },
      orderBy: { version: "desc" },
    }),
    prisma.assignment.findMany({
      where: {
        employeeId,
        type: "PPE",
      },
      include: {
        material: true,
        deliveryItem: {
          include: {
            delivery: {
              include: { user: true },
            },
          },
        },
      },
      orderBy: { issuedAt: "desc" },
    }),
  ]);

  if (!employee) {
    throw new Error("Colaborador nao encontrado.");
  }

  const latestDocument = documents[0] ?? null;
  const selectedDocument = version
    ? documents.find((document) => document.version === version) ?? null
    : latestDocument;

  if (version && !selectedDocument) {
    throw new Error("Versao da ficha de EPI nao encontrada.");
  }

  const filteredAssignments = filterAssignmentsForDocumentDate(
    assignments,
    selectedDocument?.issuedAt ?? null,
  );

  return {
    employee,
    assignments: filteredAssignments,
    allAssignments: assignments,
    documents,
    document: selectedDocument,
    latestDocument,
    availableVersions: documents.map((document) => ({
      id: document.id,
      version: document.version,
      issuedAt: document.issuedAt,
      hash: document.hash,
    })),
  };
}

export async function auditDocumentReprint(params: {
  userId: string;
  type: "UNIFORM" | "PPE";
  documentId?: string | null;
  deliveryId?: string | null;
  employeeId: string;
  version?: number | null;
  source: "RECEIPT_PAGE" | "PPE_SHEET_PAGE";
}) {
  const { userId, type, documentId, deliveryId, employeeId, version, source } = params;

  return await logAudit({
    userId,
    action: type === "UNIFORM" ? "REPRINT_RECEIPT" : "REPRINT_PPE_SHEET",
    entity: "Document",
    entityId: documentId || deliveryId || employeeId,
    details:
      type === "UNIFORM"
        ? "Reimpressao de recibo de entrega"
        : `Reimpressao da ficha historica de EPI${version ? ` v${version}` : ""}`,
    metadata: {
      type,
      employeeId,
      deliveryId: deliveryId || null,
      documentId: documentId || null,
      version: version || null,
      source,
      printedAt: new Date().toISOString(),
    },
  });
}
