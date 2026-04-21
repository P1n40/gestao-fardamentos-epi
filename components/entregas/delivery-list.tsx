/* eslint-disable */
"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Search, FileText, ChevronRight, Filter, CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DeliveryFormDialog } from "./delivery-form-dialog";

interface DeliveryListProps {
  initialDeliveries: any[];
  employees: any[];
  materials: any[];
}

export function DeliveryList({ initialDeliveries, employees, materials }: DeliveryListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "UNIFORM" | "PPE">("ALL");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredDeliveries = (
    initialDeliveries as // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any[]
  ).filter((d) => {
    const matchesSearch =
      d.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.employee.documentId.includes(searchTerm);
    const matchesType = filterType === "ALL" || d.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Buscar por colaborador ou CPF..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 overflow-hidden rounded-md border">
            <Button
              variant={filterType === "ALL" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 rounded-none"
              onClick={() => setFilterType("ALL")}
            >
              Todos
            </Button>
            <Button
              variant={filterType === "UNIFORM" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 rounded-none border-l"
              onClick={() => setFilterType("UNIFORM")}
            >
              Fardamento
            </Button>
            <Button
              variant={filterType === "PPE" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 rounded-none border-l"
              onClick={() => setFilterType("PPE")}
            >
              EPI
            </Button>
          </div>

          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Entrega
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {filteredDeliveries.map((delivery) => (
          <Card key={delivery.id} className="overflow-hidden">
            <div
              className={`h-1 w-full ${delivery.type === "UNIFORM" ? "bg-blue-500" : "bg-orange-500"}`}
            />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-zinc-100 p-2">
                  <FileText className="h-5 w-5 text-zinc-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Entrega #{delivery.id.slice(-6).toUpperCase()}
                  </CardTitle>
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <span>
                      Colaborador: <strong>{delivery.employee.name}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      {format(new Date(delivery.issuedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={delivery.type === "UNIFORM" ? "default" : "secondary"}
                  className={delivery.type === "PPE" ? "bg-orange-100 text-orange-700" : ""}
                >
                  {delivery.type === "UNIFORM" ? "Fardamento" : "EPI"}
                </Badge>
                {delivery.receiptUrl ? (
                  <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                    <CheckCircle2 className="h-3.3 mr-1 w-3" /> Assinado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-zinc-500">
                    <Clock className="mr-1 h-3" /> Pendente Assinatura
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[400px]">Item</TableHead>
                      <TableHead>CA</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (delivery as any).items.map((item: any) => (
                        <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.material.name}</TableCell>
                        <TableCell className="font-mono text-xs text-zinc-500">
                          {item.caNumber || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quantity} {item.material.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.isReplacement ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] tracking-wider uppercase"
                            >
                              Substituição
                            </Badge>
                          ) : (
                            <Badge
                              variant="ghost"
                              className="bg-zinc-50 text-[10px] tracking-wider uppercase"
                            >
                              Novo
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="text-muted-foreground mt-4 flex items-center justify-between border-t pt-4 text-xs">
                <div className="flex gap-4">
                  <span>Operador: {delivery.user.name}</span>
                  {delivery.notes && <span className="italic">&quot;{delivery.notes}&quot;</span>}
                </div>
                <a
                  href={
                    delivery.type === "PPE" && delivery.document
                      ? `/colaboradores/${delivery.employee.id}/ficha-epi?version=${delivery.document.version}`
                      : `/entregas/${delivery.id}/recibo`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ring-offset-background focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground inline-flex h-7 items-center justify-center gap-1 rounded-md px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                >
                  {delivery.type === "PPE" && delivery.document
                    ? `Reimprimir Ficha v${delivery.document.version}`
                    : "Reimprimir Recibo"}{" "}
                  <ChevronRight className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredDeliveries.length === 0 && (
          <div className="text-muted-foreground flex h-40 flex-col items-center justify-center rounded-lg border border-dashed">
            <Filter className="mb-2 h-8 w-8 opacity-20" />
            <p>Nenhuma entrega encontrada para os critérios selecionados.</p>
          </div>
        )}
      </div>

      <DeliveryFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        employees={employees}
        materials={materials}
      />
    </div>
  );
}
