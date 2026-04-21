"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
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
import { ImportSummary } from "@/modules/importacao/schemas";

interface ImportResultViewProps {
  summary: ImportSummary;
  showTitle?: boolean;
}

export function ImportResultView({ summary, showTitle = true }: ImportResultViewProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const counts = useMemo(() => {
    return summary.details.reduce(
      (acc, d) => {
        const type = (d.classification || "ERROR").toLowerCase() as keyof typeof acc;
        if (acc[type] !== undefined) acc[type]++;
        return acc;
      },
      { create: 0, update: 0, ambiguous: 0, error: 0, unchanged: 0 },
    );
  }, [summary]);

  const filteredLines = useMemo(() => {
    return summary.details.filter(
      (d) =>
        !searchTerm ||
        d.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.errors?.some((e) => e.toLowerCase().includes(searchTerm.toLowerCase())) ||
        d.classification?.toLowerCase() === searchTerm.toLowerCase(),
    );
  }, [summary, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Mini Stats Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatItem label="Novos" count={counts.create} color="blue" sub="Para criar" />
        <StatItem label="Atualizar" count={counts.update} color="amber" sub="Mudanças" />
        <StatItem label="Ambíguos" count={counts.ambiguous} color="orange" sub="Atenção" />
        <StatItem label="Erros" count={counts.error} color="red" sub="Falhas" />
        <StatItem label="Iguais" count={counts.unchanged} color="zinc" sub="Sem alteração" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              {showTitle && <CardTitle>Resultado do Processamento</CardTitle>}
              <CardDescription>Resumo de {summary.total} registros analisados.</CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Filtrar por nome ou erro..."
                className="h-9 pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">Todos ({summary.total})</TabsTrigger>
              <TabsTrigger value="create" className="text-blue-600">
                Novos ({counts.create})
              </TabsTrigger>
              <TabsTrigger value="update" className="text-amber-600">
                Alt ({counts.update})
              </TabsTrigger>
              <TabsTrigger value="ambiguous" className="text-orange-600">
                Ambíguos ({counts.ambiguous})
              </TabsTrigger>
              <TabsTrigger value="error" className="text-red-600">
                Erros ({counts.error})
              </TabsTrigger>
            </TabsList>

            {["all", "create", "update", "ambiguous", "error"].map((tab) => (
              <TabsContent key={tab} value={tab}>
                <div className="max-h-[500px] overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-zinc-50">
                      <TableRow>
                        <TableHead className="w-16">Linha</TableHead>
                        <TableHead className="w-64">Registro</TableHead>
                        <TableHead className="w-32">Status</TableHead>
                        <TableHead>Mudanças / Motivos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLines
                        .filter(
                          (line) => tab === "all" || line.classification?.toLowerCase() === tab,
                        )
                        .slice(0, 100)
                        .map((line, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-[10px] text-zinc-400">
                              {line.row}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium">
                                {line.employeeName || "Dados Inválidos"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <ClassificationBadge type={line.classification} />
                            </TableCell>
                            <TableCell className="text-xs">
                              {line.diff && line.diff.length > 0 && (
                                <ul className="space-y-0.5 text-amber-700">
                                  {line.diff.map((d, dIdx) => (
                                    <li key={dIdx}>• {d}</li>
                                  ))}
                                </ul>
                              )}
                              {line.errors && line.errors.length > 0 && (
                                <ul className="list-inside list-disc text-red-600">
                                  {line.errors.map((err, eIdx) => (
                                    <li key={eIdx}>{err}</li>
                                  ))}
                                </ul>
                              )}
                              {!line.diff && (!line.errors || line.errors.length === 0) && (
                                <span className="text-zinc-400 italic">Sem observações</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function StatItem({
  label,
  count,
  color,
  sub,
}: {
  label: string;
  count: number;
  color: string;
  sub: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    red: "border-red-200 bg-red-50 text-red-700",
    zinc: "border-zinc-200 bg-zinc-50 text-zinc-700",
  };

  return (
    <Card className={colorMap[color]}>
      <CardHeader className="p-3">
        <CardTitle className="text-[10px] font-bold uppercase opacity-80">{label}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <p className="text-xl font-bold">{count}</p>
        <p className="text-[9px] opacity-70">{sub}</p>
      </CardContent>
    </Card>
  );
}

function ClassificationBadge({ type }: { type?: string }) {
  switch (type) {
    case "CREATE":
      return (
        <Badge className="border-blue-200 bg-blue-100 text-blue-700 shadow-none hover:bg-blue-100">
          CRIAR
        </Badge>
      );
    case "UPDATE":
      return (
        <Badge className="border-amber-200 bg-amber-100 text-amber-700 shadow-none hover:bg-amber-100">
          ATUALIZAR
        </Badge>
      );
    case "AMBIGUOUS":
      return (
        <Badge className="border-orange-200 bg-orange-100 text-orange-700 shadow-none hover:bg-orange-100">
          AMBÍGUO
        </Badge>
      );
    case "ERROR":
      return (
        <Badge variant="destructive" className="shadow-none">
          ERRO
        </Badge>
      );
    case "UNCHANGED":
      return (
        <Badge variant="outline" className="bg-zinc-50 text-zinc-500 shadow-none">
          SEM ALT.
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="shadow-none">
          N/A
        </Badge>
      );
  }
}
