import type { Employee, Position } from "@prisma/client";
import { FileSpreadsheet, Users } from "lucide-react";
import Link from "next/link";

import { EmployeeList } from "@/components/employees/employee-list";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth-server";
import { cn } from "@/lib/utils";
import { getEmployees } from "@/modules/colaboradores/services";
import { getPositions } from "@/modules/posicoes/services";

export default async function ColaboradoresPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requirePermission("MANAGE_EMPLOYEES");

  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : undefined;
  const positionId = typeof params.position === "string" ? params.position : undefined;
  const status =
    typeof params.status === "string" && ["active", "inactive", "all"].includes(params.status)
      ? (params.status as "active" | "inactive" | "all")
      : "all";
  const page = typeof params.page === "string" ? parseInt(params.page) : 1;
  const pageSize = 10;

  const [employeesData, positions] = await Promise.all([
    getEmployees({
      search,
      positionId,
      status,
      page,
      pageSize,
    }),
    getPositions(true), // Only active positions for selecting
  ]);

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-2">
          <div className="text-primary flex items-center gap-2">
            <Users className="h-6 w-6" />
            <h1 className="text-3xl font-bold tracking-tight">Gestão de Colaboradores</h1>
          </div>
          <p className="text-muted-foreground">
            Cadastre e gerencie a base de colaboradores, cargos e tamanhos de uniformes/EPIs.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/colaboradores/importacao"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "gap-2 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800",
            )}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Importar Base
          </Link>
        </div>
      </div>

      <EmployeeList
        initialEmployees={employeesData.items as (Employee & { position: Position })[]}
        positions={positions as Position[]}
        totalItems={employeesData.total}
        totalPages={employeesData.totalPages}
        currentPage={employeesData.page}
      />
    </main>
  );
}
