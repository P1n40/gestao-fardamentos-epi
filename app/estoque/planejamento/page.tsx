import { AlertTriangle, CheckCircle, Info, ShoppingCart, TrendingDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth-server";
import { cn } from "@/lib/utils";
import { buildPrioritizedReplenishmentReport, getPlanningReport } from "@/modules/estoque/services";

function formatDate(date: Date | null) {
  if (!date) {
    return "Sem historico";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date);
}

export default async function PlanejamentoPage() {
  await requirePermission("MANAGE_MATERIALS");

  const report = await getPlanningReport();
  const prioritizedReport = buildPrioritizedReplenishmentReport(report);

  const criticalItems = report.filter((item) => item.status === "CRITICAL");
  const warningItems = report.filter((item) => item.status === "WARNING");
  const healthyItems = report.length - criticalItems.length - warningItems.length;
  const totalConsumedLast90Days = report.reduce(
    (total, item) => total + item.historicalConsumption.consumedLast90Days,
    0,
  );
  const trackedVariants = report.filter(
    (item) => item.historicalConsumption.totalConsumed > 0,
  ).length;
  const totalActiveBasePurchaseNeed = report.reduce(
    (total, item) => total + item.purchaseSuggestion.activeBasePurchaseNeed,
    0,
  );
  const totalMinimumBufferPurchaseNeed = report.reduce(
    (total, item) => total + item.purchaseSuggestion.minimumBufferPurchaseNeed,
    0,
  );
  const totalRecentAdmissionsDemand = report.reduce(
    (total, item) => total + item.projectionSignals.recentAdmissionsDemand,
    0,
  );
  const totalPotentialReturns = report.reduce(
    (total, item) => total + item.projectionSignals.potentialReturnsFromInactive,
    0,
  );
  const totalMissingSizingData = report.reduce(
    (total, item) => total + item.projectionSignals.missingSizingData,
    0,
  );

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-8">
      <div className="flex flex-col gap-2">
        <div className="text-primary flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" />
          <h1 className="text-3xl font-bold tracking-tight">Planejamento de Compras</h1>
        </div>
        <p className="text-muted-foreground">
          Leitura combinada de estoque atual, kits previstos e consumo historico por item e
          variante.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-l-destructive border-l-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium uppercase">
              <TrendingDown className="text-destructive h-4 w-4" /> Itens criticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalItems.length}</div>
            <p className="text-muted-foreground text-xs">Saldo abaixo do estoque minimo</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium uppercase">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Itens em alerta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warningItems.length}</div>
            <p className="text-muted-foreground text-xs">Gaps identificados no campo</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium uppercase">
              <CheckCircle className="h-4 w-4 text-green-500" /> Itens saudaveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthyItems}</div>
            <p className="text-muted-foreground text-xs">Cobertura nominal garantida</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium uppercase">
              <Info className="h-4 w-4 text-sky-500" /> Consumo historico 90d
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConsumedLast90Days}</div>
            <p className="text-muted-foreground text-xs">
              {trackedVariants} variante(s) com giro real no periodo
            </p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
            Reposicao priorizada por risco de ruptura
          </h2>
          <p className="text-sm text-zinc-600">
            Relatorio resumido para decidir o que comprar primeiro, combinando criticidade de
            estoque, base ativa, cobertura historica e pressao operacional recente.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Risco alto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-700">
                {prioritizedReport.summary.highRiskItems}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Risco medio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700">
                {prioritizedReport.summary.mediumRiskItems}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Risco baixo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-700">
                {prioritizedReport.summary.lowRiskItems}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Unidades sugeridas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sky-700">
                {prioritizedReport.summary.suggestedUnits}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Compra imediata</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-950">
                {prioritizedReport.summary.immediateUnits}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50">
              <tr className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                <th className="px-6 py-4">Prioridade</th>
                <th className="px-6 py-4">Material</th>
                <th className="px-6 py-4 text-center">Sugestao</th>
                <th className="px-6 py-4 text-center">Cobertura</th>
                <th className="px-6 py-4">Sinais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {prioritizedReport.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-zinc-500">
                    Nenhum item com risco relevante de ruptura no recorte atual.
                  </td>
                </tr>
              ) : (
                prioritizedReport.items.slice(0, 8).map((item) => (
                  <tr key={item.id} className="align-top transition-colors hover:bg-zinc-50/50">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <Badge
                          className={cn(
                            "w-fit text-[10px] font-bold uppercase",
                            item.riskLevel === "HIGH"
                              ? "bg-destructive text-white"
                              : item.riskLevel === "MEDIUM"
                                ? "border-amber-200 bg-amber-100 text-amber-700"
                                : "border-zinc-200 bg-zinc-100 text-zinc-600",
                          )}
                        >
                          {item.riskLevel === "HIGH"
                            ? "Alto"
                            : item.riskLevel === "MEDIUM"
                              ? "Medio"
                              : "Baixo"}
                        </Badge>
                        <span className="text-xs text-zinc-500">Score: {item.riskScore}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-900">{item.name}</div>
                      <div className="text-[10px] text-zinc-500">
                        {item.category === "UNIFORM" ? "Fardamento" : "EPI"}
                        {item.size ? ` - ${item.size}` : ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col">
                        <span className="text-primary text-lg font-bold">{item.totalSuggested}</span>
                        <span className="text-[9px] text-zinc-500">
                          Base ativa: {item.activeBasePurchaseNeed}
                        </span>
                        <span className="text-[9px] text-zinc-500">
                          Buffer: {item.minimumBufferPurchaseNeed}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.stockCoverageMonths !== null ? (
                        <span className="font-mono text-zinc-700">
                          {item.stockCoverageMonths} mes(es)
                        </span>
                      ) : (
                        <span className="text-zinc-400">Sem base</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {item.reasons.map((reason) => (
                          <Badge
                            key={`${item.id}-${reason}`}
                            variant="outline"
                            className="border-zinc-200 bg-white text-[10px] text-zinc-600"
                          >
                            {reason}
                          </Badge>
                        ))}
                        {item.recentAdmissionsDemand > 0 ? (
                          <Badge
                            variant="outline"
                            className="border-sky-200 bg-sky-50 text-[10px] text-sky-700"
                          >
                            Admissoes: {item.recentAdmissionsDemand}
                          </Badge>
                        ) : null}
                        {item.missingSizingData > 0 ? (
                          <Badge
                            variant="outline"
                            className="border-rose-200 bg-rose-50 text-[10px] text-rose-700"
                          >
                            Sizing: {item.missingSizingData}
                          </Badge>
                        ) : null}
                        {item.potentialReturnsFromInactive > 0 ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                          >
                            Retorno potencial: {item.potentialReturnsFromInactive}
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50">
            <tr className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
              <th className="px-6 py-4">Material</th>
              <th className="px-6 py-4 text-center">Cat.</th>
              <th className="px-6 py-4 text-center">Estoque atual</th>
              <th className="px-6 py-4 text-center">Minimo</th>
              <th className="px-6 py-4 text-center">Base ativa</th>
              <th className="px-6 py-4 text-center">Consumo historico</th>
              <th className="px-6 py-4 text-center">Cobertura</th>
              <th className="text-primary bg-primary/5 px-6 py-4 text-center font-bold">
                Sugestao compra
              </th>
              <th className="px-6 py-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {report.map((item) => (
              <tr key={item.id} className="transition-colors hover:bg-zinc-50/50">
                <td className="px-6 py-4">
                  <div className="font-medium text-zinc-900">{item.name}</div>
                  <div className="text-[10px] text-zinc-500">
                    {item.size || "Tamanho unico"} - {item.unit}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <Badge variant="outline" className="text-[9px] tracking-tighter uppercase">
                    {item.category === "UNIFORM" ? "Unif" : "EPI"}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-center font-mono">{item.stock}</td>
                <td className="text-muted-foreground px-6 py-4 text-center font-mono">
                  {item.minStock}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex flex-col">
                    <span className="font-mono text-zinc-600">{item.totalRequired}</span>
                    <span className="text-[9px] text-zinc-400">
                      Em campo: {item.currentAssignments}
                    </span>
                    <span className="text-[9px] text-amber-600">
                      Gap: {item.purchaseSuggestion.fieldGap}
                    </span>
                    {item.projectionSignals.recentAdmissionsDemand > 0 ? (
                      <span className="text-[9px] text-sky-700">
                        Admissoes 90d: {item.projectionSignals.recentAdmissionsDemand}
                      </span>
                    ) : null}
                    {item.projectionSignals.missingSizingData > 0 ? (
                      <span className="text-[9px] text-rose-600">
                        Sizing pendente: {item.projectionSignals.missingSizingData}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex flex-col">
                    <span className="font-mono text-zinc-700">
                      30d: {item.historicalConsumption.consumedLast30Days}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      90d: {item.historicalConsumption.consumedLast90Days} - media/mes:{" "}
                      {item.historicalConsumption.averageMonthlyConsumption}
                    </span>
                    <span className="text-[9px] text-zinc-400">
                      Ultimo consumo: {formatDate(item.historicalConsumption.lastConsumedAt)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  {item.historicalConsumption.stockCoverageMonths !== null ? (
                    <div className="flex flex-col">
                      <span className="font-mono text-zinc-700">
                        {item.historicalConsumption.stockCoverageMonths} mes(es)
                      </span>
                      <span className="text-[9px] text-zinc-400">
                        Buffer ref.: {item.historicalConsumption.recommendedMonthlyBuffer}
                      </span>
                      {item.projectionSignals.potentialReturnsFromInactive > 0 ? (
                        <span className="text-[9px] text-emerald-700">
                          Retorno potencial: {item.projectionSignals.potentialReturnsFromInactive}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="text-zinc-400">Sem base</span>
                      {item.projectionSignals.potentialReturnsFromInactive > 0 ? (
                        <span className="text-[9px] text-emerald-700">
                          Retorno potencial: {item.projectionSignals.potentialReturnsFromInactive}
                        </span>
                      ) : null}
                    </div>
                  )}
                </td>
                <td className="bg-primary/5 px-6 py-4 text-center">
                  <div className="flex flex-col">
                    {item.totalSuggested > 0 ? (
                      <span className="text-primary text-lg font-bold">{item.totalSuggested}</span>
                    ) : (
                      <span className="text-zinc-300">-</span>
                    )}
                    <span className="text-[9px] text-zinc-500">
                      Base ativa: {item.purchaseSuggestion.activeBasePurchaseNeed}
                    </span>
                    <span className="text-[9px] text-zinc-500">
                      Buffer minimo: {item.purchaseSuggestion.minimumBufferPurchaseNeed}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <Badge
                    className={cn(
                      "text-[10px] font-bold uppercase",
                      item.status === "CRITICAL"
                        ? "bg-destructive text-white"
                        : item.status === "WARNING"
                          ? "border-amber-200 bg-amber-100 text-amber-700"
                          : "border-zinc-200 bg-zinc-100 text-zinc-500",
                    )}
                  >
                    {item.status === "CRITICAL"
                      ? "Critico"
                      : item.status === "WARNING"
                        ? "Alerta"
                        : "OK"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-6">
        <Info className="h-6 w-6 shrink-0 text-blue-500" />
        <div className="text-sm text-blue-800">
          <p className="mb-1 font-bold">Como interpretamos estes dados?</p>
          <p>
            A sugestao de compra agora cruza a base ativa do kit, o saldo ja emitido, o estoque
            disponivel para regularizacao e o buffer minimo desejado. Assim, o sistema separa o
            que precisa ser comprado para cobrir a base ativa do que precisa ser comprado para
            recompor o estoque minimo. O consumo historico continua visivel para apoiar a leitura
            de giro real e cobertura antes de fechar a compra.
          </p>
          <p className="mt-2 text-xs text-blue-700">
            Consolidado desta leitura: {totalActiveBasePurchaseNeed} unidade(s) para regularizar a
            base ativa e {totalMinimumBufferPurchaseNeed} para recompor o buffer minimo.
          </p>
          <p className="mt-2 text-xs text-blue-700">
            Sinais adicionais da projeção: {totalRecentAdmissionsDemand} unidade(s) ligadas a
            admissoes recentes, {totalPotentialReturns} em retorno potencial de desligados e{" "}
            {totalMissingSizingData} com sizing pendente para variante especifica.
          </p>
        </div>
      </div>
    </main>
  );
}
