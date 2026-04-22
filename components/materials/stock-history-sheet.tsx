"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, ArrowUpCircle, ArrowDownCircle, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { fetchStockHistory } from "@/modules/estoque/actions";

interface Transaction {
  id: string;
  type: "INPUT" | "OUTPUT" | "ADJUSTMENT";
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  notes: string | null;
  createdAt: Date;
}

interface StockHistorySheetProps {
  materialId?: string;
  materialName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockHistorySheet({
  materialId,
  materialName,
  open,
  onOpenChange,
}: StockHistorySheetProps) {
  const [history, setHistory] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!materialId) return;
    setIsLoading(true);
    const result = await fetchStockHistory(materialId);
    if (result.history) {
      setHistory(result.history as unknown as Transaction[]);
    }
    setIsLoading(false);
  }, [materialId]);

  useEffect(() => {
    if (materialId && open) {
      loadHistory();
    }
  }, [materialId, open, loadHistory]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "INPUT":
        return <ArrowUpCircle className="h-4 w-4 text-green-500" />;
      case "OUTPUT":
        return <ArrowDownCircle className="h-4 w-4 text-red-500" />;
      default:
        return <RefreshCcw className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case "INPUT":
        return "Entrada";
      case "OUTPUT":
        return "Saída";
      default:
        return "Ajuste";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[min(calc(100vw-1rem),540px)]">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <History className="text-primary h-5 w-5" />
            <SheetTitle>Histórico de Estoque</SheetTitle>
          </div>
          <SheetDescription>
            Exibindo as últimas 50 movimentações de <strong>{materialName}</strong>.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-8">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <RefreshCcw className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : history.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-200px)] pr-4">
              <div className="space-y-6">
                {history.map((tx) => (
                  <div
                    key={tx.id}
                    className="border-muted relative border-l-2 pb-2 pl-4 last:border-0"
                  >
                    <div className="bg-background absolute top-0 -left-[9px]">
                      {getTypeIcon(tx.type)}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                          {getTypeName(tx.type)} •{" "}
                          {format(new Date(tx.createdAt), "dd MMM yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                        <Badge
                          variant={tx.quantity > 0 ? "default" : "destructive"}
                          className="h-5 px-1.5 text-[10px]"
                        >
                          {tx.quantity > 0 ? "+" : ""}
                          {tx.quantity}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{tx.reason}</p>
                      {tx.notes && (
                        <p className="text-muted-foreground text-xs italic">{tx.notes}</p>
                      )}
                      <div className="text-muted-foreground mt-1 flex items-center gap-2 font-mono text-[10px] font-bold">
                        <span>SALDO: {tx.balanceBefore}</span>
                        <span>→</span>
                        <span className="text-primary">{tx.balanceAfter}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
              <History className="text-muted-foreground h-10 w-10 opacity-20" />
              <p className="text-muted-foreground text-sm">Nenhuma movimentação registrada.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
