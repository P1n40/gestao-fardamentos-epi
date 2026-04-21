import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { Pool } from "pg";

import {
  HOMOLOGATION_SCENARIOS,
  getCriticalHomologationScenarios,
  validateHomologationScenarioCatalog,
} from "../lib/homologation-scenarios";

dotenv.config({ path: ".env.local" });
dotenv.config();

function createPrismaClient() {
  const url = process.env.DATABASE_URL?.replace(/^["'](.+)["']$/, "$1");
  if (!url) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function formatStatus(ok: boolean) {
  return ok ? "OK" : "PENDENTE";
}

async function main() {
  validateHomologationScenarioCatalog();

  const prisma = createPrismaClient();

  try {
    await prisma.$queryRaw`SELECT 1`;

    const [
      activeUsers,
      activePositions,
      activeMaterials,
      activeEmployees,
      activeKitRevisions,
      deliveries,
      documents,
      auditLogs,
    ] = await Promise.all([
      prisma.user.count({ where: { active: true } }),
      prisma.position.count({ where: { active: true } }),
      prisma.material.count({ where: { active: true } }),
      prisma.employee.count({ where: { active: true } }),
      prisma.kitRevision.count({ where: { isActive: true } }),
      prisma.delivery.count(),
      prisma.document.count(),
      prisma.auditLog.count(),
    ]);

    const checks = [
      {
        label: "Banco acessivel",
        ok: true,
        detail: "SELECT 1 executado com sucesso",
      },
      {
        label: "Usuarios ativos",
        ok: activeUsers >= 4,
        detail: `${activeUsers} usuario(s) ativo(s)`,
      },
      {
        label: "Cargos ativos",
        ok: activePositions >= 1,
        detail: `${activePositions} cargo(s) ativo(s)`,
      },
      {
        label: "Materiais ativos",
        ok: activeMaterials >= 2,
        detail: `${activeMaterials} material(is) ativo(s)`,
      },
      {
        label: "Kits ativos",
        ok: activeKitRevisions >= 1,
        detail: `${activeKitRevisions} revisao(oes) ativa(s)`,
      },
      {
        label: "Colaboradores ativos",
        ok: activeEmployees >= 1,
        detail: `${activeEmployees} colaborador(es) ativo(s)`,
      },
    ];

    console.log("[homologation] Pre-check de ambiente");
    console.log(`[homologation] APP_ENV: ${process.env.APP_ENV ?? "development"}`);
    console.log(`[homologation] Cenarios catalogados: ${HOMOLOGATION_SCENARIOS.length}`);
    console.log(`[homologation] Cenarios criticos: ${getCriticalHomologationScenarios().length}`);
    console.log("");

    for (const check of checks) {
      console.log(`[${formatStatus(check.ok)}] ${check.label}: ${check.detail}`);
    }

    console.log("");
    console.log("[homologation] Sinais operacionais atuais");
    console.log(`- Entregas registradas: ${deliveries}`);
    console.log(`- Documentos emitidos: ${documents}`);
    console.log(`- Eventos de auditoria: ${auditLogs}`);

    const blockers = checks.filter((check) => !check.ok);
    if (blockers.length > 0) {
      console.log("");
      console.log("[homologation] Bloqueadores encontrados:");
      blockers.forEach((blocker) => console.log(`- ${blocker.label}: ${blocker.detail}`));
      console.log("");
      console.log(
        "[homologation] Sugestao: rode npm run seed:initial com SEED_INCLUDE_SAMPLE_DATA=true em staging, se apropriado.",
      );
      process.exit(1);
    }

    console.log("");
    console.log("[homologation] Ambiente apto para iniciar homologacao guiada.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[homologation] Falha no pre-check:", error);
  process.exit(1);
});
