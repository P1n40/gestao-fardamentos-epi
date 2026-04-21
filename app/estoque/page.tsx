/* eslint-disable */
import { Metadata } from "next";

import { InventoryDashboard } from "@/components/stock/inventory-dashboard";
import { requirePermission } from "@/lib/auth-server";
import { userHasPermission } from "@/lib/rbac";
import { getStockInitializationStatus } from "@/modules/configuracoes/actions";
import { getMaterials, getStockHistory } from "@/modules/estoque/services";

export const metadata: Metadata = {
  title: "Gestão de Estoque | Sistema de Fardamentos",
  description: "Monitoramento de saldos e movimentações de estoque.",
};

export default async function EstoquePage() {
  const session = await requirePermission("MANAGE_MATERIALS");

  const [materials, recentTransactions, stockInitialized, canInitializeStock] = await Promise.all([
    getMaterials(true),
    getStockHistory(undefined, 100), // Get last 100 movements globally
    getStockInitializationStatus(),
    userHasPermission(session.user.id, "ESTOQUE_INICIALIZAR"),
  ]);

  return (
    <main className="container mx-auto px-4 py-8">
      <InventoryDashboard
        materials={materials}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recentTransactions={recentTransactions as any}
        canInitializeStock={canInitializeStock}
        stockInitialized={stockInitialized}
      />
    </main>
  );
}
