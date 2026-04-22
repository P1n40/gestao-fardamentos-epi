/* eslint-disable */
import { ShieldAlert } from "lucide-react";
import Image from "next/image";

import { DeliveryList } from "@/components/entregas/delivery-list";
import { requirePermission } from "@/lib/auth-server";
import { getEmployees } from "@/modules/colaboradores/services";
import { fetchDeliveries } from "@/modules/entregas/actions";
import { getMaterials } from "@/modules/estoque/services";

export default async function EntregasPage() {
  await requirePermission("MANAGE_DELIVERIES");

  const [deliveries, employeesData, materials] = await Promise.all([
    fetchDeliveries({ limit: 50 }),
    getEmployees({ pageSize: 1000, status: "active" }),
    getMaterials(true),
  ]);

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:p-8">
      <div className="flex flex-col gap-2">
        <div className="text-primary flex items-center gap-2">
          <Image src="/logo.png" alt="Logo da Empresa" width={80} height={40} className="mr-2" />
          <ShieldAlert className="h-6 w-6" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Entregas de Fardamento e EPI
          </h1>
        </div>
        <p className="text-muted-foreground">
          Gerencie a entrega de kits, novos itens e substituições. Rastreabilidade completa para RH
          e Jurídico.
        </p>
      </div>

      <DeliveryList
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialDeliveries={deliveries as any[]}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        employees={employeesData.items as any[]}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        materials={materials as any[]}
      />
    </main>
  );
}
