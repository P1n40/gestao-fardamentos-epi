import { Category, PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

import { PERMISSION_DEFINITIONS, ROLE_PERMISSIONS } from "../lib/auth-utils";

dotenv.config({ path: ".env.local" });
dotenv.config();

const prismaClientSingleton = () => {
  const url = process.env.DATABASE_URL?.replace(/^["'](.+)["']$/, "$1");
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

const prisma = prismaClientSingleton();

const APP_ENV = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "admin123";
const INCLUDE_SAMPLE_DATA = process.env.SEED_INCLUDE_SAMPLE_DATA === "true";
const ALLOW_PRODUCTION = process.env.SEED_ALLOW_PRODUCTION === "true";

function assertSeedSafety() {
  if (APP_ENV === "production" && !ALLOW_PRODUCTION) {
    throw new Error(
      "Seed em producao bloqueado. Defina SEED_ALLOW_PRODUCTION=true para executar conscientemente.",
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL nao configurada para o seed.");
  }
}

async function seedUsers(hashedPassword: string) {
  const users = [
    { email: "admin@empresa.com", name: "Administrador do Sistema", role: UserRole.ADMIN },
    {
      email: "rh@empresa.com",
      name: "Responsavel Almoxarifado",
      role: UserRole.RH_ALMOXARIFADO,
    },
    { email: "gestor@empresa.com", name: "Gestor Operacional", role: UserRole.GESTOR },
    { email: "op@empresa.com", name: "Operador do Sistema", role: UserRole.OPERADOR },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        password: hashedPassword,
        role: user.role,
        active: true,
      },
      create: {
        email: user.email,
        name: user.name,
        password: hashedPassword,
        role: user.role,
        active: true,
      },
    });
  }

  return users.map((user) => user.email);
}

async function seedAccessProfiles() {
  const names: Record<UserRole, string> = {
    ADMIN: "Administrador",
    RH_ALMOXARIFADO: "RH / Almoxarifado",
    GESTOR: "Gestor",
    OPERADOR: "Operador",
  };

  for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS) as Array<
    [UserRole, (typeof PERMISSION_DEFINITIONS)[number]["code"][]]
  >) {
    const profile = await prisma.accessProfile.upsert({
      where: { role },
      update: {
        name: names[role],
        active: true,
      },
      create: {
        role,
        name: names[role],
        description: `Perfil padrao ${names[role]}`,
        active: true,
      },
    });

    await prisma.profilePermission.deleteMany({ where: { profileId: profile.id } });
    await prisma.profilePermission.createMany({
      data: permissions.map((code) => {
        const definition = PERMISSION_DEFINITIONS.find((item) => item.code === code);
        return {
          profileId: profile.id,
          code,
          route: definition?.route ?? "/",
          action: definition?.action ?? "executar",
          description: definition?.description ?? code,
        };
      }),
      skipDuplicates: true,
    });

    await prisma.user.updateMany({
      where: { role, profileId: null },
      data: { profileId: profile.id },
    });
  }
}

async function seedPositions() {
  async function upsertPositionByAliases(params: {
    canonicalName: string;
    aliases?: string[];
    description: string;
    department: string;
    requiresUniform: boolean;
    requiresPPE: boolean;
  }) {
    const existing = await prisma.position.findFirst({
      where: {
        OR: [params.canonicalName, ...(params.aliases ?? [])].map((name) => ({ name })),
      },
    });

    if (existing) {
      return prisma.position.update({
        where: { id: existing.id },
        data: {
          name: params.canonicalName,
          description: params.description,
          department: params.department,
          requiresUniform: params.requiresUniform,
          requiresPPE: params.requiresPPE,
          active: true,
        },
      });
    }

    return prisma.position.create({
      data: {
        name: params.canonicalName,
        description: params.description,
        department: params.department,
        requiresUniform: params.requiresUniform,
        requiresPPE: params.requiresPPE,
        active: true,
      },
    });
  }

  const positions = await Promise.all([
    upsertPositionByAliases({
      canonicalName: "Administrador",
      description: "Acesso total ao sistema",
      department: "TI / Gestao",
      requiresUniform: false,
      requiresPPE: false,
    }),
    upsertPositionByAliases({
      canonicalName: "Operador de Producao",
      aliases: ["Operador de Produção"],
      description: "Operador da linha de frente",
      department: "Operacional",
      requiresUniform: true,
      requiresPPE: true,
    }),
    upsertPositionByAliases({
      canonicalName: "Auxiliar de Obras",
      description: "Equipe de manutencao e obras",
      department: "Infraestrutura",
      requiresUniform: true,
      requiresPPE: true,
    }),
  ]);

  return {
    admin: positions[0],
    operator: positions[1],
    works: positions[2],
  };
}

async function seedMaterials() {
  const materials = await Promise.all([
    prisma.material.upsert({
      where: { sku: "UNIF-POLO-AZUL-M" },
      update: {
        stock: 100,
        minStock: 15,
        active: true,
      },
      create: {
        sku: "UNIF-POLO-AZUL-M",
        name: "Camisa Polo Azul",
        description: "Camisa polo padrao",
        category: Category.UNIFORM,
        unit: "UN",
        size: "M",
        stock: 100,
        minStock: 15,
      },
    }),
    prisma.material.upsert({
      where: { sku: "UNIF-CALCA-BRIM-42" },
      update: {
        stock: 80,
        minStock: 10,
        active: true,
      },
      create: {
        sku: "UNIF-CALCA-BRIM-42",
        name: "Calca Brim Azul",
        description: "Calca de uniforme operacional",
        category: Category.UNIFORM,
        unit: "UN",
        size: "42",
        stock: 80,
        minStock: 10,
      },
    }),
    prisma.material.upsert({
      where: { sku: "PPE-BOOT-40" },
      update: {
        stock: 50,
        minStock: 8,
        active: true,
      },
      create: {
        sku: "PPE-BOOT-40",
        name: "Bota de Seguranca",
        description: "Bota com biqueira de aco",
        category: Category.PPE,
        unit: "PAR",
        size: "40",
        caNumber: "12345",
        stock: 50,
        minStock: 8,
      },
    }),
    prisma.material.upsert({
      where: { sku: "PPE-LUVA-RASPA" },
      update: {
        stock: 200,
        minStock: 20,
        active: true,
      },
      create: {
        sku: "PPE-LUVA-RASPA",
        name: "Luva de Raspa",
        description: "Luva de protecao para manutencao",
        category: Category.PPE,
        unit: "PAR",
        caNumber: "54321",
        stock: 200,
        minStock: 20,
      },
    }),
  ]);

  return {
    shirt: materials[0],
    pants: materials[1],
    boot: materials[2],
    gloves: materials[3],
  };
}

async function seedActiveKitRevision(params: {
  positionId: string;
  items: Array<{
    materialId: string;
    quantity: number;
    periodDays: number | null;
    mandatory: boolean;
  }>;
}) {
  const activeRevision = await prisma.kitRevision.findFirst({
    where: {
      positionId: params.positionId,
      isActive: true,
    },
    include: {
      items: true,
    },
  });

  if (!activeRevision) {
    await prisma.kitRevision.create({
      data: {
        positionId: params.positionId,
        version: 1,
        isActive: true,
        validFrom: new Date(),
        items: {
          create: params.items,
        },
      },
    });
    return;
  }

  for (const item of params.items) {
    await prisma.kitItem.upsert({
      where: {
        revisionId_materialId: {
          revisionId: activeRevision.id,
          materialId: item.materialId,
        },
      },
      update: {
        quantity: item.quantity,
        periodDays: item.periodDays,
        mandatory: item.mandatory,
      },
      create: {
        revisionId: activeRevision.id,
        materialId: item.materialId,
        quantity: item.quantity,
        periodDays: item.periodDays,
        mandatory: item.mandatory,
      },
    });
  }
}

async function seedSampleData(params: { operatorPositionId: string }) {
  if (!INCLUDE_SAMPLE_DATA) {
    return;
  }

  await prisma.employee.upsert({
    where: { documentId: "12345678900" },
    update: {
      name: "Joao da Silva",
      registrationCode: "MAT-001",
      positionId: params.operatorPositionId,
      active: true,
    },
    create: {
      name: "Joao da Silva",
      documentId: "12345678900",
      registrationCode: "MAT-001",
      department: "Operacional",
      positionId: params.operatorPositionId,
      shirtSize: "M",
      pantsSize: "42",
      shoeSize: "40",
      active: true,
    },
  });
}

async function main() {
  assertSeedSafety();

  console.log(`[seed] Starting initial seed for environment: ${APP_ENV}`);

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const seededUsers = await seedUsers(hashedPassword);
  await seedAccessProfiles();
  const positions = await seedPositions();
  const materials = await seedMaterials();

  await seedActiveKitRevision({
    positionId: positions.operator.id,
    items: [
      { materialId: materials.shirt.id, quantity: 3, periodDays: 180, mandatory: true },
      { materialId: materials.pants.id, quantity: 2, periodDays: 180, mandatory: true },
      { materialId: materials.boot.id, quantity: 1, periodDays: 365, mandatory: true },
      { materialId: materials.gloves.id, quantity: 2, periodDays: 30, mandatory: true },
    ],
  });

  await seedSampleData({
    operatorPositionId: positions.operator.id,
  });

  console.log("[seed] Initial seed completed successfully.");
  console.log(`[seed] Users available: ${seededUsers.join(", ")}`);
  console.log(
    `[seed] Default password: ${DEFAULT_PASSWORD}${APP_ENV === "production" ? " (change immediately after first access)" : ""}`,
  );
  console.log(`[seed] Sample operational data: ${INCLUDE_SAMPLE_DATA ? "enabled" : "disabled"}`);
}

main()
  .catch((error) => {
    console.error("[seed] Failure:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
