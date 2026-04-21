import Link from "next/link";
import { AlertTriangle, ArrowRight, Package, ShieldAlert, TrendingUp, Users } from "lucide-react";
import Image from "next/image";

import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData, DashboardFilterOptions } from "@/modules/dashboard/services";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function AggregateReportTable({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: DashboardData["aggregateReports"]["byDepartment"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-5 text-sm text-emerald-800">
            Nenhuma pendencia agregada encontrada para este recorte.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50">
                <tr className="text-xs text-zinc-500">
                  <th className="px-4 py-3 font-medium">
                    {title.includes("secretaria") ? "Secretaria" : "Cargo"}
                  </th>
                  <th className="px-4 py-3 text-center font-medium">Ativos</th>
                  <th className="px-4 py-3 text-center font-medium">Colab. pendentes</th>
                  <th className="px-4 py-3 text-center font-medium">Itens pendentes</th>
                  <th className="px-4 py-3 text-center font-medium">Alertas</th>
                  <th className="px-4 py-3 text-center font-medium">Fardamento</th>
                  <th className="px-4 py-3 text-center font-medium">EPI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {items.slice(0, 8).map((item) => (
                  <tr key={item.key} className="align-top">
                    <td className="px-4 py-3 font-medium text-zinc-900">{item.label}</td>
                    <td className="px-4 py-3 text-center text-zinc-600">{item.activeEmployees}</td>
                    <td className="px-4 py-3 text-center text-zinc-600">
                      {item.employeesWithPending}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-amber-700">
                      {item.totalPendingItems}
                    </td>
                    <td className="px-4 py-3 text-center text-zinc-600">
                      {item.totalWarningItems}
                    </td>
                    <td className="px-4 py-3 text-center text-zinc-600">
                      {item.missingUniformItems}
                    </td>
                    <td className="px-4 py-3 text-center text-zinc-600">{item.missingPpeItems}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface DashboardOverviewProps {
  data: DashboardData;
  filterOptions: DashboardFilterOptions;
}

export function DashboardOverview({ data, filterOptions }: DashboardOverviewProps) {
  const selectedPosition = filterOptions.positions.find(
    (position) => position.value === data.filters.positionId,
  );
  const metricCards = [
    {
      key: "activeEmployees",
      icon: Users,
      accentClass: "border-l-4 border-l-blue-500",
      valueClass: "text-blue-700",
      metric: data.metrics.activeEmployees,
    },
    {
      key: "pendingEmployees",
      icon: AlertTriangle,
      accentClass: "border-l-4 border-l-amber-500",
      valueClass: "text-amber-700",
      metric: data.metrics.pendingEmployees,
    },
    {
      key: "criticalStockItems",
      icon: Package,
      accentClass: "border-l-4 border-l-rose-500",
      valueClass: "text-rose-700",
      metric: data.metrics.criticalStockItems,
    },
    {
      key: "deliveriesThisMonth",
      icon: TrendingUp,
      accentClass: "border-l-4 border-l-emerald-500",
      valueClass: "text-emerald-700",
      metric: data.metrics.deliveriesThisMonth,
    },
  ] as const;

  const activeFilterLabels = [
    data.filters.department ? `Secretaria: ${data.filters.department}` : null,
    selectedPosition ? `Cargo: ${selectedPosition.label}` : null,
    filterOptions.periods.find((period) => period.value === data.filters.period)?.label ?? null,
  ].filter(Boolean);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-white via-zinc-50 to-sky-50 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Image src="/logo.png" alt="Logo da Empresa" width={170} height={62} />
              <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                Dashboard Operacional
              </Badge>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
                Indicadores principais de fardamento e EPI
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-zinc-600">
                Acompanhe base ativa, pendencias de kit, estoque critico e volume de entregas para
                tomar decisao mais rapido no dia a dia.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {activeFilterLabels.map((label) => (
                  <Badge
                    key={label}
                    variant="outline"
                    className="border-zinc-200 bg-white/80 text-zinc-700"
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
              <div className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Gerado em
              </div>
              <div className="mt-2 text-sm font-medium text-zinc-900">
                {formatDate(data.generatedAt)}
              </div>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
              <div className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Fardamento no periodo
              </div>
              <div className="mt-2 text-2xl font-semibold text-zinc-950">
                {data.deliveryBreakdown.uniform}
              </div>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
              <div className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                EPI no periodo
              </div>
              <div className="mt-2 text-2xl font-semibold text-zinc-950">
                {data.deliveryBreakdown.ppe}
              </div>
            </div>
          </div>
        </div>
      </section>

      <DashboardFilters
        options={filterOptions}
        selected={{
          department: data.filters.department,
          positionId: data.filters.positionId,
          period: data.filters.period,
        }}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <Card key={card.key} className={card.accentClass}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.metric.label}</CardTitle>
              <card.icon className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-semibold ${card.valueClass}`}>{card.metric.value}</div>
              <CardDescription className="mt-2 leading-5">
                {card.metric.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Colaboradores com pendencias operacionais</CardTitle>
              <CardDescription>
                Pendencias com base no kit ativo do cargo e nas emissoes vigentes.
              </CardDescription>
            </div>
            <Link
              href="/colaboradores"
              className="text-primary text-sm font-medium hover:underline"
            >
              Ver colaboradores
            </Link>
          </CardHeader>
          <CardContent>
            {data.pendingEmployees.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-5 text-sm text-emerald-800">
                Nenhuma pendencia critica encontrada no momento.
              </div>
            ) : (
              <div className="space-y-3">
                {data.pendingEmployees.map((employee) => (
                  <div
                    key={employee.employeeId}
                    className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/colaboradores/${employee.employeeId}`}
                          className="font-medium text-zinc-950 hover:text-sky-700"
                        >
                          {employee.employeeName}
                        </Link>
                        <Badge variant="outline">{employee.positionName}</Badge>
                        {employee.department ? (
                          <span className="text-xs text-zinc-500">{employee.department}</span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-zinc-600">
                        <span>{employee.pendingItems} item(ns) pendente(s)</span>
                        <span>{employee.missingUniformItems} de fardamento</span>
                        <span>{employee.missingPpeItems} de EPI</span>
                        {employee.warningItems > 0 ? (
                          <span>{employee.warningItems} em atencao</span>
                        ) : null}
                      </div>
                    </div>

                    <Link
                      href={`/colaboradores/${employee.employeeId}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:underline"
                    >
                      Abrir historico
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Estoque critico</CardTitle>
              <CardDescription>
                Itens abaixo do minimo que pedem reposicao prioritaria.
              </CardDescription>
            </div>
            <Link
              href="/estoque/planejamento"
              className="text-primary text-sm font-medium hover:underline"
            >
              Planejamento
            </Link>
          </CardHeader>
          <CardContent>
            {data.criticalMaterials.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-5 text-sm text-emerald-800">
                Nenhum item critico no estoque neste momento.
              </div>
            ) : (
              <div className="space-y-3">
                {data.criticalMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="rounded-2xl border border-zinc-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-medium text-zinc-950">{material.name}</div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <Badge variant="outline">
                            {material.category === "UNIFORM" ? "Fardamento" : "EPI"}
                          </Badge>
                          <span>Estoque: {material.stock}</span>
                          <span>Minimo: {material.minStock}</span>
                        </div>
                      </div>
                      <Badge variant="destructive">Critico</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600">
                      <span>Gap em campo: {material.missingInField}</span>
                      <span>Sugestao de compra: {material.totalSuggested}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Entregas recentes</CardTitle>
              <CardDescription>
                Ultimos eventos registrados, com separacao por tipo.
              </CardDescription>
            </div>
            <Link href="/entregas" className="text-primary text-sm font-medium hover:underline">
              Abrir entregas
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentDeliveries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600">
                Ainda nao existem entregas registradas.
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentDeliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-zinc-950">{delivery.employeeName}</span>
                        <Badge variant="outline">
                          {delivery.type === "UNIFORM" ? "Recibo" : "Ficha EPI"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                        <span>{delivery.itemCount} item(ns)</span>
                        <span>{formatDate(delivery.issuedAt)}</span>
                        <span>Operador: {delivery.operatorName ?? "Nao identificado"}</span>
                      </div>
                    </div>
                    <Link
                      href={
                        delivery.type === "UNIFORM"
                          ? `/entregas/${delivery.id}/recibo`
                          : delivery.documentVersion
                            ? `/colaboradores/${delivery.employeeId}/ficha-epi?version=${delivery.documentVersion}`
                            : `/colaboradores/${delivery.employeeId}`
                      }
                      className="inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:underline"
                    >
                      {delivery.type === "UNIFORM"
                        ? "Abrir recibo"
                        : delivery.documentVersion
                          ? "Abrir ficha EPI"
                          : "Ver colaborador"}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 text-zinc-50">
          <CardHeader>
            <div className="flex items-center gap-2 text-zinc-300">
              <ShieldAlert className="h-5 w-5" />
              <CardTitle className="text-zinc-50">Leitura operacional</CardTitle>
            </div>
            <CardDescription className="text-zinc-400">
              Resumo rapido para priorizacao de acoes na jornada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                Prioridade 1
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-100">
                {data.metrics.criticalStockItems.value > 0
                  ? `Existem ${data.metrics.criticalStockItems.value} item(ns) critico(s) no estoque. Vale revisar o planejamento de compras antes da proxima janela de entrega.`
                  : "Nao ha itens em estoque critico. O planejamento de compras esta sob controle imediato."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                Prioridade 2
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-100">
                {data.metrics.pendingEmployees.value > 0
                  ? `${data.metrics.pendingEmployees.value} colaborador(es) ativo(s) possuem pendencias de kit. O historico individual ajuda a separar gap de fardamento e gap de EPI.`
                  : "Nao encontramos colaboradores com pendencias criticas de kit no recorte atual."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                Ritmo do periodo
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-100">
                Foram registradas {data.deliveryBreakdown.total} entrega(s) neste mes, sendo{" "}
                {data.deliveryBreakdown.uniform} de fardamento e {data.deliveryBreakdown.ppe} de
                EPI.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <AggregateReportTable
          title="Pendencias agregadas por secretaria"
          description="Consolidado de pendencias e alertas operacionais por secretaria no recorte atual."
          items={data.aggregateReports.byDepartment}
        />
        <AggregateReportTable
          title="Pendencias agregadas por cargo"
          description="Consolidado de pendencias e alertas operacionais por cargo no recorte atual."
          items={data.aggregateReports.byPosition}
        />
      </section>
    </div>
  );
}
