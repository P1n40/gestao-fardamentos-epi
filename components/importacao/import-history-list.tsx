"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, ChevronDown, ChevronRight, Eye, FileCheck, FileX, User } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface ProcessedItem {
  r: number;
  s: boolean;
  c: string;
  n: string | null;
  diff?: string[];
  err?: string[];
}

interface ImportHistoryItem {
  id: string;
  createdAt: Date;
  newValue: string | null;
  user: {
    name: string | null;
    email: string;
  };
}

function parseImportLogPayload(value: string | null) {
  if (!value) return null;

  try {
    return JSON.parse(value) as {
      counts?: Record<string, number | undefined>;
      items?: ProcessedItem[];
    };
  } catch {
    return null;
  }
}

export function ImportHistoryList({ logs }: { logs: ImportHistoryItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <Card className="border-dashed bg-zinc-50">
        <CardContent className="text-muted-foreground py-10 text-center">
          Nenhum log de importação encontrado.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => {
        const data = parseImportLogPayload(log.newValue);
        const counts = {
          total: data?.counts?.total ?? 0,
          success: data?.counts?.success ?? 0,
          error: data?.counts?.error ?? 0,
          create: data?.counts?.create ?? 0,
          update: data?.counts?.update ?? 0,
          unchanged: data?.counts?.unchanged ?? 0,
        };
        const isExpanded = expandedId === log.id;

        return (
          <Card key={log.id} className="overflow-hidden">
            <div
              className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-zinc-50"
              onClick={() => setExpandedId(isExpanded ? null : log.id)}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "rounded-lg p-2",
                    counts.error > 0
                      ? "bg-amber-100 text-amber-600"
                      : "bg-green-100 text-green-600",
                  )}
                >
                  {counts.error > 0 ? (
                    <FileX className="h-5 w-5" />
                  ) : (
                    <FileCheck className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 font-bold">
                    Lote {log.id.split("_").pop()?.slice(-6).toUpperCase()}
                    <Badge variant="outline" className="ml-2 font-mono text-[10px]">
                      {log.id}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(log.createdAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {log.user?.name || log.user?.email}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="hidden items-center gap-4 text-xs font-medium md:flex">
                  <div className="text-center">
                    <p className="text-[9px] text-zinc-500 uppercase">Sucesso</p>
                    <p className="text-green-600">{counts.success}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-zinc-500 uppercase">Erros</p>
                    <p className="text-destructive">{counts.error}</p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-zinc-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-zinc-400" />
                )}
              </div>
            </div>

            {isExpanded && data && (
              <CardContent className="border-t bg-zinc-50 p-6">
                <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-lg border bg-white p-3">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">
                      Total Processado
                    </p>
                    <p className="text-xl font-bold">{counts.total}</p>
                  </div>
                  <div className="rounded-lg border bg-white p-3">
                    <p className="text-[10px] font-bold text-green-600 uppercase">
                      Novos (Criados)
                    </p>
                    <p className="text-xl font-bold text-green-700">{counts.create}</p>
                  </div>
                  <div className="rounded-lg border bg-white p-3">
                    <p className="text-[10px] font-bold text-amber-600 uppercase">Atualizados</p>
                    <p className="text-xl font-bold text-amber-700">{counts.update}</p>
                  </div>
                  <div className="rounded-lg border bg-white p-3">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Sem Alteração</p>
                    <p className="text-xl font-bold text-zinc-500">{counts.unchanged}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-sm font-bold">
                      <Eye className="h-4 w-4" />
                      Itens Processados (Amostra)
                    </h4>
                  </div>
                  <div className="overflow-hidden rounded-lg border bg-white">
                    <Table>
                      <TableHeader className="bg-zinc-50">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-16">Linha</TableHead>
                          <TableHead>Identificação</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Observações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.items?.map((item: ProcessedItem, idx: number) => {
                          const diffItems = item.diff ?? [];
                          const errorItems = item.err ?? [];
                          const hasDiff = diffItems.length > 0;
                          const hasErrors = errorItems.length > 0;

                          return (
                            <TableRow key={idx} className="text-xs">
                            <TableCell className="font-mono text-zinc-400">#{item.r}</TableCell>
                            <TableCell className="font-medium">{item.n || "N/A"}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "h-5 px-1 text-[10px]",
                                  item.c === "CREATE" && "border-blue-200 bg-blue-50 text-blue-700",
                                  item.c === "UPDATE" &&
                                    "border-amber-200 bg-amber-50 text-amber-700",
                                  item.c === "AMBIGUOUS" &&
                                    "border-orange-200 bg-orange-50 text-orange-700",
                                  item.c === "ERROR" && "border-red-200 bg-red-50 text-red-700",
                                  item.c === "UNCHANGED" &&
                                    "border-zinc-200 bg-zinc-50 text-zinc-400",
                                )}
                              >
                                {item.c}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {hasDiff && (
                                <ul className="space-y-1">
                                  {diffItems.map((d: string, dIdx: number) => (
                                    <li key={dIdx} className="text-[10px] text-zinc-500">
                                      • {d}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {hasErrors && (
                                <ul className="space-y-1">
                                  {errorItems.map((e: string, eIdx: number) => (
                                    <li key={eIdx} className="text-destructive text-[10px]">
                                      • {e}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {!hasDiff && !hasErrors && (
                                <span className="text-[10px] text-zinc-400 italic">
                                  Sem observacoes
                                </span>
                              )}
                            </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
