"use client";

import {
  Edit2,
  FileSpreadsheet,
  History,
  ListFilter,
  Package,
  Plus,
  PlusCircle,
  PowerOff,
  Search,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { MaterialForm } from "@/components/materials/material-form";
import { MaterialImportTemplateButton } from "@/components/materials/material-import-template-button";
import { StockHistorySheet } from "@/components/materials/stock-history-sheet";
import { StockMovementDialog } from "@/components/materials/stock-movement-dialog";
import { InitialStockDialog } from "@/components/stock/initial-stock-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toggleMaterialStatus } from "@/modules/estoque/actions";

import { GlobalHistoryTable } from "./global-history-table";

interface Material {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  caNumber: string | null;
  category: "UNIFORM" | "PPE";
  stock: number;
  minStock: number;
  unit: string;
  size: string | null;
  active: boolean;
}

interface Transaction {
  id: string;
  type: "INPUT" | "OUTPUT" | "ADJUSTMENT";
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  createdAt: Date;
  material: {
    name: string;
    unit: string;
  };
}

interface InventoryDashboardProps {
  materials: Material[];
  recentTransactions: Transaction[];
  canInitializeStock: boolean;
  stockInitialized: boolean;
}

export function InventoryDashboard({
  materials,
  recentTransactions,
  canInitializeStock,
  stockInitialized,
}: InventoryDashboardProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isInitialStockOpen, setIsInitialStockOpen] = useState(false);

  const filteredMaterials = materials.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.sku?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleMovement = (material: Material) => {
    setSelectedMaterial(material);
    setIsMovementOpen(true);
  };

  const handleHistory = (material: Material) => {
    setSelectedMaterial(material);
    setIsHistoryOpen(true);
  };

  const handleEdit = (material: Material) => {
    setSelectedMaterial(material);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedMaterial(null);
    setIsFormOpen(true);
  };

  async function handleDeactivate(material: Material) {
    if (!material.active) return;

    try {
      const result = await toggleMaterialStatus(material.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Material inativado com histórico preservado.");
      router.refresh();
    } catch {
      toast.error("Erro ao inativar material.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão de Estoque</h2>
          <p className="text-muted-foreground">
            Monitore saldos e registre entradas/ajustes manuais.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canInitializeStock && !stockInitialized && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-2"
              onClick={() => setIsInitialStockOpen(true)}
            >
              <Package className="h-4 w-4" />
              Entrada Inicial de Materiais
            </Button>
          )}
          <Button type="button" size="sm" className="gap-2" onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Criar material
          </Button>
          <MaterialImportTemplateButton />
          <Link
            href="/estoque/planejamento"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
          >
            <ShoppingCart className="h-4 w-4" />
            Planejamento
          </Link>
          <Link
            href="/materiais/importacao"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Importar materiais
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
            <Package className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{materials.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abaixo do Mínimo</CardTitle>
            <Package className="text-destructive h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="destructive text-2xl font-bold">
              {materials.filter((m) => m.stock <= m.minStock).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <History className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {materials.reduce((acc, m) => acc + m.stock, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="balance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="balance" className="gap-2">
            <ListFilter className="h-4 w-4" />
            Saldos Atuais
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Histórico Global
          </TabsTrigger>
        </TabsList>

        <TabsContent value="balance">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Saldos Atuais</CardTitle>
                  <CardDescription>Visualize o estoque em tempo real.</CardDescription>
                </div>
                <div className="relative w-72">
                  <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                  <Input
                    placeholder="Pesquisar material..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium">{material.name}</TableCell>
                      <TableCell className="font-mono text-xs">{material.sku || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {material.category === "UNIFORM" ? "Fardamento" : "EPI"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {material.stock} {material.unit}
                      </TableCell>
                      <TableCell className="text-center">
                        {material.stock <= material.minStock ? (
                          <Badge variant="destructive">REPOR</Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-700 hover:bg-green-100"
                          >
                            OK
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleHistory(material)}
                            title="Histórico Individual"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(material)}
                            title="Editar Material"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleMovement(material)}
                            title="Entrada / Ajuste"
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Movimentar
                          </Button>
                          {material.active && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-amber-700"
                              onClick={() => handleDeactivate(material)}
                              title="Inativar material"
                            >
                              <PowerOff className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredMaterials.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        Nenhum material encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico Global de Movimentações</CardTitle>
              <CardDescription>Trilha de auditoria de todas as entradas e saídas.</CardDescription>
            </CardHeader>
            <CardContent>
              <GlobalHistoryTable transactions={recentTransactions} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedMaterial && (
        <>
          <StockMovementDialog
            open={isMovementOpen}
            onOpenChange={setIsMovementOpen}
            materialId={selectedMaterial.id}
            materialName={selectedMaterial.name}
            currentStock={selectedMaterial.stock}
          />
          <StockHistorySheet
            open={isHistoryOpen}
            onOpenChange={setIsHistoryOpen}
            materialId={selectedMaterial.id}
            materialName={selectedMaterial.name}
          />
        </>
      )}

      <MaterialForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        material={selectedMaterial ?? undefined}
      />
      <InitialStockDialog
        open={isInitialStockOpen}
        onOpenChange={setIsInitialStockOpen}
        materials={materials}
      />
    </div>
  );
}
