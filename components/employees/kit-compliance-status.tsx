"use client";

import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Info,
  PackageCheck,
  PackageOpen,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type KitComplianceItem } from "@/modules/colaboradores/services";

interface KitComplianceStatusProps {
  compliance: {
    items: KitComplianceItem[];
    extras: {
      materialName: string;
      quantity: number;
      issuedAt: Date;
      category: "UNIFORM" | "PPE";
    }[];
  };
}

export function KitComplianceStatus({ compliance }: KitComplianceStatusProps) {
  const { items, extras } = compliance;

  const totalItems = items.length;
  const okItems = items.filter((i) => i.status === "OK" || i.status === "WARNING").length;
  const compliancePercentage = totalItems > 0 ? (okItems / totalItems) * 100 : 0;

  const getStatusIcon = (status: KitComplianceItem["status"]) => {
    switch (status) {
      case "OK":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "PENDING":
        return <AlertCircle className="text-destructive h-4 w-4" />;
      case "EXPIRED":
        return <Clock className="text-destructive h-4 w-4" />;
      case "WARNING":
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-zinc-300" />;
    }
  };

  const getStatusLabel = (status: KitComplianceItem["status"]) => {
    switch (status) {
      case "OK":
        return "Regular";
      case "PENDING":
        return "Pendente";
      case "EXPIRED":
        return "Vencido";
      case "WARNING":
        return "Próximo Vencimento";
      default:
        return "Desconhecido";
    }
  };

  return (
    <div className="space-y-8">
      {/* Compliance Header */}
      <div className="flex flex-col items-center justify-between gap-6 rounded-xl border border-zinc-100 bg-zinc-50 p-6 md:flex-row">
        <div className="flex w-full flex-col gap-2 md:w-auto">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-zinc-500" />
            <h3 className="text-lg font-bold">Índice de Conformidade do Kit</h3>
          </div>
          <p className="text-sm text-zinc-500">
            Percentual de itens entregues e dentro do prazo em relação ao kit exigido pelo cargo.
          </p>
        </div>

        <div className="flex w-full items-center gap-4 md:w-64">
          <div className="w-full space-y-2">
            <div className="flex items-end justify-between">
              <span className="text-primary text-2xl font-black">
                {Math.round(compliancePercentage)}%
              </span>
              <span className="text-xs font-medium text-zinc-400">
                {okItems} de {totalItems} itens OK
              </span>
            </div>
            <Progress value={compliancePercentage} className="h-2 bg-zinc-200" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Uniform Compliance */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <PackageCheck className="h-4 w-4 text-blue-500" />
            <h4 className="text-sm font-bold tracking-widest text-zinc-500 uppercase">
              Exigência de Fardamento
            </h4>
          </div>

          <div className="overflow-hidden rounded-lg border bg-white">
            <Table>
              <TableHeader className="bg-zinc-50/50">
                <TableRow>
                  <TableHead>Material Exigido</TableHead>
                  <TableHead className="text-center">Previsto</TableHead>
                  <TableHead className="text-center">Válido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Entrega</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items
                  .filter((i) => i.category === "UNIFORM")
                  .map((item) => (
                    <TableRow key={item.materialId}>
                      <TableCell className="font-medium">{item.materialName}</TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {item.requiredQuantity} {item.unit}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-center font-mono text-xs",
                          item.deliveredQuantity < item.requiredQuantity
                            ? "text-destructive font-bold"
                            : "text-green-600",
                        )}
                      >
                        {item.deliveredQuantity} {item.unit}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              item.status === "PENDING" || item.status === "EXPIRED"
                                ? "text-destructive"
                                : "",
                            )}
                          >
                            {getStatusLabel(item.status)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {item.lastIssuedAt
                          ? format(item.lastIssuedAt, "dd/MM/yyyy")
                          : "Nunca entregue"}
                      </TableCell>
                    </TableRow>
                  ))}
                {items.filter((i) => i.category === "UNIFORM").length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-sm text-zinc-400 italic"
                    >
                      Este cargo não exige fardamento no kit básico.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* PPE Compliance */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2 pt-4">
            <ShieldCheck className="h-4 w-4 text-orange-500" />
            <h4 className="text-sm font-bold tracking-widest text-zinc-500 uppercase">
              Exigência de EPI (Segurança)
            </h4>
          </div>

          <div className="overflow-hidden rounded-lg border bg-white">
            <Table>
              <TableHeader className="bg-zinc-50/50">
                <TableRow>
                  <TableHead>EPI Exigido</TableHead>
                  <TableHead className="text-center">Previsto</TableHead>
                  <TableHead className="text-center">Válido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reposição / Vencimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items
                  .filter((i) => i.category === "PPE")
                  .map((item) => (
                    <TableRow key={item.materialId}>
                      <TableCell className="font-medium">{item.materialName}</TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {item.requiredQuantity} {item.unit}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-center font-mono text-xs",
                          item.deliveredQuantity < item.requiredQuantity
                            ? "text-destructive font-bold"
                            : "text-green-600",
                        )}
                      >
                        {item.deliveredQuantity} {item.unit}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              item.status === "PENDING" || item.status === "EXPIRED"
                                ? "text-destructive"
                                : "",
                            )}
                          >
                            {getStatusLabel(item.status)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-muted-foreground text-xs">
                            {item.nextReplenishmentAt
                              ? format(item.nextReplenishmentAt, "dd/MM/yyyy")
                              : "N/A"}
                          </span>
                          {item.daysToReplenish !== null && (
                            <span
                              className={cn(
                                "text-[10px] font-bold tracking-tight uppercase",
                                item.daysToReplenish <= 0
                                  ? "text-destructive"
                                  : item.daysToReplenish <= 30
                                    ? "text-amber-600"
                                    : "text-zinc-400",
                              )}
                            >
                              {item.daysToReplenish <= 0
                                ? "Vencido"
                                : `Inspirado em ${item.daysToReplenish} dias`}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                {items.filter((i) => i.category === "PPE").length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-sm text-zinc-400 italic"
                    >
                      Este cargo não exige EPIs no kit básico.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Extras / Adicionais */}
        {extras.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2 pt-4">
              <PackageOpen className="h-4 w-4 text-zinc-400" />
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold tracking-widest text-zinc-500 uppercase">
                  Materiais Extras Entregues
                </h4>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-zinc-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        Itens entregues que não fazem parte do kit básico vinculada ao cargo do
                        colaborador.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border bg-white/50">
              <Table>
                <TableHeader className="bg-zinc-50/30">
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-center">Quantidade</TableHead>
                    <TableHead className="text-right">Data de Entrega</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extras.map((extra, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-sm font-medium">{extra.materialName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {extra.category === "PPE" ? "EPI" : "Fardamento"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {extra.quantity} UN
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-xs">
                        {format(extra.issuedAt, "dd/MM/yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
