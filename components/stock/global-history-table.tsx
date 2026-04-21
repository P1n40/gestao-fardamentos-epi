"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

interface GlobalHistoryTableProps {
  transactions: Transaction[];
}

export function GlobalHistoryTable({ transactions }: GlobalHistoryTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Data/Hora</TableHead>
            <TableHead>Material</TableHead>
            <TableHead>Operação</TableHead>
            <TableHead className="text-right">Qtd</TableHead>
            <TableHead className="text-right">Saldo Final</TableHead>
            <TableHead>Justificativa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell className="muted-foreground text-xs whitespace-nowrap">
                {format(new Date(tx.createdAt), "dd/MM/yy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </TableCell>
              <TableCell className="font-medium">{tx.material.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {tx.type === "INPUT" && (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                      <ArrowUpRight className="mr-1 h-3 w-3" /> Entrada
                    </Badge>
                  )}
                  {tx.type === "OUTPUT" && (
                    <Badge variant="destructive">
                      <ArrowDownRight className="mr-1 h-3 w-3" /> Saída
                    </Badge>
                  )}
                  {tx.type === "ADJUSTMENT" && (
                    <Badge variant="outline">
                      <Scale className="mr-1 h-3 w-3" /> Ajuste
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell
                className={`text-right font-mono font-bold ${
                  tx.quantity > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
              </TableCell>
              <TableCell className="text-right font-mono font-medium">
                {tx.balanceAfter} {tx.material.unit}
              </TableCell>
              <TableCell className="max-w-[200px] truncate" title={tx.reason}>
                {tx.reason}
              </TableCell>
            </TableRow>
          ))}
          {transactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                Nenhuma movimentação registrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
