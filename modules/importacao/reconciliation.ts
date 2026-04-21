import { PrismaClient, Employee } from "@prisma/client";
import { normalizeString, normalizeCPF } from "@/lib/utils/reconciliation";
import { ImportClassification } from "./schemas";

interface ReconciliationResult {
  classification: ImportClassification;
  existingRecord: Employee | null;
  conflicts: string[];
}

/**
 * Reconciles an incoming employee record with the existing database.
 * 
 * Heuristics:
 * 1. Match by CPF (Primary)
 * 2. Match by Registration Code (Secondary)
 * 3. Search by Normalized Name (Tertiary/Warning)
 */
export async function reconcileEmployee(
  prisma: PrismaClient,
  data: {
    name: string;
    documentId: string;
    registrationCode?: string | null;
  }
): Promise<ReconciliationResult> {
  const cleanCpf = normalizeCPF(data.documentId);
  const cleanName = normalizeString(data.name);
  const conflicts: string[] = [];

  // 1. Try Exact CPF Match
  const byCpf = await prisma.employee.findUnique({
    where: { documentId: cleanCpf },
    include: { position: true },
  });

  if (byCpf) {
    return {
      classification: "UPDATE",
      existingRecord: byCpf as any, // Cast due to include
      conflicts: [],
    };
  }

  // 2. Try Registration Code Match (if provided)
  if (data.registrationCode && data.registrationCode.trim() !== "") {
    const byReg = await prisma.employee.findUnique({
      where: { registrationCode: data.registrationCode },
      include: { position: true },
    });

    if (byReg) {
      // We found a record with the same Matrícula but different CPF (since 1. failed)
      // This is a high-risk scenario: ID conflict.
      const existingName = normalizeString(byReg.name);
      
      if (existingName === cleanName) {
        // Same person, new CPF? Still ambiguous.
        return {
          classification: "AMBIGUOUS",
          existingRecord: byReg as any,
          conflicts: [`Conflito de ID: Mesma matrícula (${data.registrationCode}) e nome, mas CPF diferente.`],
        };
      }

      // Completely different person? Very ambiguous/dangerous.
      return {
        classification: "AMBIGUOUS",
        existingRecord: byReg as any,
        conflicts: [`CONFLITO CRÍTICO: Matrícula ${data.registrationCode} pertence a ${byReg.name} (CPF: ${byReg.documentId}).`],
      };
    }
  }

  // 3. Normalized Name Search (Potential Duplicates)
  // We look for any active employee with the same normalized name
  const potentialNameMatches = await prisma.employee.findMany({
    where: { 
      active: true,
      // We'll filter in JS for precise normalization if needed, 
      // but for simple reconciliation we'll start with exact match or normalized DB search
    },
    take: 10,
  });

  const nameMatch = potentialNameMatches.find(e => normalizeString(e.name) === cleanName);

  if (nameMatch) {
    return {
      classification: "AMBIGUOUS",
      existingRecord: nameMatch,
      conflicts: [`Possível duplicidade: Nome idêntico encontrado para CPF ${nameMatch.documentId}.`],
    };
  }

  // 4. No match found
  return {
    classification: "CREATE",
    existingRecord: null,
    conflicts: [],
  };
}
