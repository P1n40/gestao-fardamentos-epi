"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Filter, History, Plus, Power, PowerOff, Repeat, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fetchMaterialsQuery } from "@/lib/query/fetchers";
import { queryKeys } from "@/lib/query/keys";
import { toggleMaterialStatus } from "@/modules/estoque/actions";

import { MaterialForm } from "./material-form";
import { StockHistorySheet } from "./stock-history-sheet";
import { StockMovementDialog } from "./stock-movement-dialog";

interface Material {
  id: string;
  name: string;
  description: string | null;
  category: "UNIFORM" | "PPE";
  unit: string;
  size: string | null;
  sku: string | null;
  caNumber: string | null;
  stock: number;
  minStock: number;
  active: boolean;
  createdAt: Date;
}

interface MaterialListProps {
  initialMaterials: Material[];
}

export function MaterialList({ initialMaterials }: MaterialListProps) {
  const queryClient = useQueryClient();
  const materialsQuery = useQuery({
    queryKey: queryKeys.materials({ onlyActive: false }),
    queryFn: () => fetchMaterialsQuery({ onlyActive: false }),
    initialData: initialMaterials,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | undefined>();

  const materials = materialsQuery.data as Material[];
  const filtered = materials.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === "all" || m.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  async function handleToggleStatus(id: string) {
    try {
      const result = await toggleMaterialStatus(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Status do material atualizado!");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["materials"] }),
          queryClient.invalidateQueries({ queryKey: queryKeys.stockOverview() }),
        ]);
      }
    } catch {
      toast.error("Erro ao alterar status");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative w-full sm:w-72">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="Pesquisar por nome ou SKU..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || "all")}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Categoria" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Categorias</SelectItem>
              <SelectItem value="UNIFORM">Fardamento</SelectItem>
              <SelectItem value="PPE">EPI</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            setSelectedMaterial(undefined);
            setIsFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Criar material
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Material</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((material) => (
                <TableRow
                  key={material.id}
                  className={!material.active ? "bg-muted/30 opacity-60" : ""}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{material.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {material.size ? `Tamanho: ${material.size}` : material.unit}
                        {material.category === "PPE" && material.caNumber
                          ? ` | CA: ${material.caNumber}`
                          : ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{material.sku || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        material.category === "UNIFORM"
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-orange-200 bg-orange-50 text-orange-700"
                      }
                    >
                      {material.category === "UNIFORM" ? "Fardamento" : "EPI"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          material.stock <= material.minStock ? "text-destructive font-bold" : ""
                        }
                      >
                        {material.stock}
                      </span>
                      {material.stock <= material.minStock && (
                        <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                          REPOR
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={material.active ? "default" : "secondary"}>
                      {material.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedMaterial(material);
                                  setIsMovementOpen(true);
                                }}
                              >
                                <Repeat className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <TooltipContent>Movimentar Estoque</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedMaterial(material);
                                  setIsHistoryOpen(true);
                                }}
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <TooltipContent>Ver Histórico</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedMaterial(material);
                                  setIsFormOpen(true);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <TooltipContent>Editar Material</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleStatus(material.id)}
                                className={material.active ? "text-amber-600" : "text-green-600"}
                              >
                                {material.active ? (
                                  <PowerOff className="h-4 w-4" />
                                ) : (
                                  <Power className="h-4 w-4" />
                                )}
                              </Button>
                            }
                          />
                          <TooltipContent>
                            {material.active ? "Desativar" : "Ativar"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Nenhum material encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <MaterialForm open={isFormOpen} onOpenChange={setIsFormOpen} material={selectedMaterial} />

      <StockHistorySheet
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        materialId={selectedMaterial?.id}
        materialName={selectedMaterial?.name}
      />

      <StockMovementDialog
        open={isMovementOpen}
        onOpenChange={setIsMovementOpen}
        materialId={selectedMaterial?.id}
        materialName={selectedMaterial?.name}
        currentStock={selectedMaterial?.stock || 0}
      />
    </div>
  );
}
