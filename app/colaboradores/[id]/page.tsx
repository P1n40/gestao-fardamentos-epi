import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  History,
  Info,
  MapPin,
  Package,
  Shield,
  UserCircle2,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ComplianceShortcutButton } from "@/components/employees/compliance-shortcut-button";
import { KitComplianceStatus } from "@/components/employees/kit-compliance-status";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requirePermission } from "@/lib/auth-server";
import {
  getDocumentActionLabel,
  getDocumentHref,
  getDocumentTypeLabel,
} from "@/lib/document-links";
import { cn } from "@/lib/utils";
import { getEmployeeProfileWithCompliance } from "@/modules/colaboradores/services";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  await requirePermission("MANAGE_EMPLOYEES");

  const data = await getEmployeeProfileWithCompliance(id);

  if (!data) {
    notFound();
  }

  const { employee, deliveries, documents, activeAssignments, compliance } = data;

  // Calculate Compliance Summary for US-40
  const pendingItems = compliance.items.filter(
    (i) => i.status === "PENDING" || i.status === "EXPIRED",
  );
  const nearExpiryItems = compliance.items.filter((i) => i.status === "WARNING");
  const nextReplenishment = compliance.items
    .filter((i) => i.nextReplenishmentAt)
    .sort((a, b) => a.nextReplenishmentAt!.getTime() - b.nextReplenishmentAt!.getTime())[0];

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-8">
      {/* Pendency Alert Banner */}
      {pendingItems.length > 0 && (
        <div className="border-destructive/20 bg-destructive/5 text-destructive flex items-center justify-between rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="text-sm font-bold">Pendências de Material Identificadas</p>
              <p className="text-xs opacity-80">
                O colaborador possui {pendingItems.length} item(ns) pendente(s) ou vencido(s) em
                relação ao kit do cargo.
              </p>
            </div>
          </div>
          <ComplianceShortcutButton />
        </div>
      )}

      {/* Back Button and Header */}
      <div className="flex flex-col gap-4">
        <Link
          href="/colaboradores"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit gap-2")}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para lista
        </Link>

        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
              <UserCircle2 className="h-10 w-10" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{employee.name}</h1>
                <Badge variant={employee.active ? "default" : "secondary"}>
                  {employee.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {employee.position.name}
                </span>
                {employee.department && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {employee.department}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  ID: {employee.id.slice(-8).toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/colaboradores/${employee.id}/ficha-epi`}
              target="_blank"
              className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
            >
              <Shield className="h-4 w-4 text-orange-600" />
              Ficha EPI
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card
          className={cn(
            "border-zinc-100 shadow-sm",
            pendingItems.length > 0 && "border-destructive/20 bg-destructive/5",
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle
              className={cn(
                "text-sm font-medium tracking-wider text-zinc-500 uppercase",
                pendingItems.length > 0 && "text-destructive",
              )}
            >
              Pendências Atuais
            </CardTitle>
            <AlertCircle
              className={cn("h-4 w-4 text-zinc-400", pendingItems.length > 0 && "text-destructive")}
            />
          </CardHeader>
          <CardContent>
            <div
              className={cn("text-2xl font-bold", pendingItems.length > 0 && "text-destructive")}
            >
              {pendingItems.length}
            </div>
            <p className="text-muted-foreground text-xs">Itens faltantes ou vencidos</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium tracking-wider text-zinc-500 uppercase">
              Próxima Reposição
            </CardTitle>
            <Clock className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {nextReplenishment?.nextReplenishmentAt
                ? format(nextReplenishment.nextReplenishmentAt, "dd/MM/yy")
                : "--"}
            </div>
            <p className="text-muted-foreground text-xs">
              {nextReplenishment ? nextReplenishment.materialName : "Nenhuma prevista"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium tracking-wider text-zinc-500 uppercase">
              Materiais no Campo
            </CardTitle>
            <Package className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAssignments.length}</div>
            <p className="text-muted-foreground text-xs">Itens ativos atualmente</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium tracking-wider text-zinc-500 uppercase">
              Alertas de Vencimento
            </CardTitle>
            <History className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nearExpiryItems.length}</div>
            <p className="text-muted-foreground text-xs">Vencendo nos próximos 30 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="history" className="space-y-6">
        <TabsList className="border border-zinc-100 bg-zinc-100/50 p-1">
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Histórico Cronológico
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2">
            <Shield className="h-4 w-4" />
            Previsto vs Entregue
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <Package className="h-4 w-4" />
            Materiais em Uso
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="sizing" className="gap-2">
            <Info className="h-4 w-4" />
            Dados e Tamanhos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-6">
          <Card className="border-zinc-100 shadow-sm">
            <CardHeader>
              <CardTitle>Linha do Tempo de Entregas</CardTitle>
              <CardDescription>Eventos operacionais por ordem cronológica.</CardDescription>
            </CardHeader>
            <CardContent>
              {deliveries.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">
                    Nenhuma entrega registrada para este colaborador.
                  </p>
                </div>
              ) : (
                <div className="relative space-y-8 before:absolute before:top-2 before:left-4 before:h-[calc(100%-16px)] before:w-0.5 before:bg-zinc-100 sm:before:left-6">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {deliveries.map((delivery: any) => (
                    <div key={delivery.id} className="relative pl-10 sm:pl-16">
                      <div
                        className={`absolute top-1 left-0 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white sm:h-12 sm:w-12 ${
                          delivery.type === "PPE" ? "border-orange-500" : "border-blue-500"
                        }`}
                      >
                        {delivery.type === "PPE" ? (
                          <Shield className="h-4 w-4 text-orange-600 sm:h-6 sm:w-6" />
                        ) : (
                          <Package className="h-4 w-4 text-blue-600 sm:h-6 sm:w-6" />
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">
                              Entrega de {delivery.type === "PPE" ? "EPI" : "Fardamento"}
                            </span>
                            <Badge variant="outline" className="text-[10px] tracking-tight">
                              ID: {delivery.id.slice(-8).toUpperCase()}
                            </Badge>
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {format(new Date(delivery.issuedAt), "PPP 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>

                        <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              {delivery.items.map((item: any) => (
                                <div
                                  key={item.id}
                                  className="flex flex-col gap-1 border-l-2 border-zinc-200 pl-3"
                                >
                                  <span className="text-sm font-medium">{item.material.name}</span>
                                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                                    <span>
                                      Qtd: {item.quantity} {item.material.unit}
                                    </span>
                                    {item.caNumber && (
                                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold">
                                        CA: {item.caNumber}
                                      </span>
                                    )}
                                    {item.isReplacement && (
                                      <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                                        Subst.
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {delivery.notes && (
                              <>
                                <Separator className="bg-zinc-200/50" />
                                <div className="text-xs text-zinc-500 italic">
                                  &quot;{delivery.notes}&quot;
                                </div>
                              </>
                            )}

                            <Separator className="bg-zinc-200/50" />

                            <div className="flex flex-col gap-3 rounded-lg border border-dashed border-zinc-200 bg-white/80 p-3">
                              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                                <div className="flex items-start gap-2">
                                  <FileText className="mt-0.5 h-4 w-4 text-zinc-400" />
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                      Documento emitido
                                    </p>
                                    {delivery.document ? (
                                      <div className="space-y-1">
                                        <p className="text-sm font-medium text-zinc-900">
                                          {getDocumentTypeLabel(delivery.type)}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                                          <span>Doc ID: {delivery.document.id.slice(-8).toUpperCase()}</span>
                                          <span>•</span>
                                          <span>Versão: v{delivery.document.version}</span>
                                          <span>•</span>
                                          <span>
                                            Emitido em{" "}
                                            {format(new Date(delivery.document.issuedAt), "dd/MM/yyyy HH:mm")}
                                          </span>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-zinc-500">
                                        Nenhum documento vinculado a esta entrega.
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <Badge
                                  variant={delivery.document ? "outline" : "secondary"}
                                  className={
                                    delivery.document
                                      ? "border-green-200 bg-green-50 text-green-700"
                                      : ""
                                  }
                                >
                                  {delivery.document ? "Emitido" : "Não emitido"}
                                </Badge>
                              </div>

                              {delivery.document &&
                                getDocumentHref({
                                  type: delivery.type,
                                  employeeId: employee.id,
                                  deliveryId: delivery.id,
                                  version: delivery.document.version,
                                }) && (
                                  <div className="flex justify-end pt-1">
                                    <Link
                                      href={
                                        getDocumentHref({
                                          type: delivery.type,
                                          employeeId: employee.id,
                                          deliveryId: delivery.id,
                                          version: delivery.document.version,
                                        })!
                                      }
                                      target="_blank"
                                      className={cn(
                                        buttonVariants({ variant: "link", size: "sm" }),
                                        "text-primary h-auto gap-1 p-0",
                                      )}
                                    >
                                      {getDocumentActionLabel(
                                        delivery.type,
                                        delivery.document.version,
                                      )}
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </Link>
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>

                        <div className="text-muted-foreground flex items-center gap-1 text-[10px] tracking-wide uppercase">
                          <UserCircle2 className="h-3 w-3" />
                          Operador: {delivery.user?.name || "Desconhecido"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <Card className="border-zinc-100 shadow-sm">
            <CardHeader>
              <CardTitle>Conformidade com o Kit do Cargo</CardTitle>
              <CardDescription>
                Cruzamento entre o que o colaborador deve possuir e o que foi efetivamente entregue
                e está válido.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KitComplianceStatus compliance={compliance} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-6">
          <Card className="border-zinc-100 shadow-sm">
            <CardHeader>
              <CardTitle>Materiais em Uso Atualmente</CardTitle>
              <CardDescription>Listagem de todos os itens em posse do colaborador.</CardDescription>
            </CardHeader>
            <CardContent>
              {activeAssignments.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">
                    O colaborador não possui materiais ativos no momento.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Data de Entrega</TableHead>
                      <TableHead>C.A.</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {activeAssignments.map((assignment: any) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">{assignment.material.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={assignment.type === "PPE" ? "outline" : "default"}
                            className={
                              assignment.type === "PPE"
                                ? "border-orange-200 bg-orange-50 text-orange-700"
                                : ""
                            }
                          >
                            {assignment.type === "PPE" ? "EPI" : "Fardamento"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {assignment.quantity} {assignment.material.unit}
                        </TableCell>
                        <TableCell>{format(new Date(assignment.issuedAt), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {assignment.caNumber || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={
                              assignment.deliveryItem
                                ? `/entregas/${assignment.deliveryItem.deliveryId}/recibo`
                                : "/entregas"
                            }
                            target={assignment.deliveryItem ? "_blank" : undefined}
                            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                          >
                            Detalhes
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card className="border-zinc-100 shadow-sm">
            <CardHeader>
              <CardTitle>Repositório de Documentos</CardTitle>
              <CardDescription>Recibos de fardamento e fichas de EPI versionadas.</CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">Nenhum documento gerado ainda.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo de Documento</TableHead>
                      <TableHead>Versão</TableHead>
                      <TableHead>Data de Emissão</TableHead>
                      <TableHead>Relação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {documents.map((doc: any) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-zinc-400" />
                            {doc.type === "PPE" ? "Ficha Histórica de EPI" : "Recibo de Entrega"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">v{doc.version}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(doc.issuedAt), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell className="text-xs text-zinc-500">
                          {doc.deliveryId
                            ? `Entrega ID: ${doc.deliveryId.slice(-6)}`
                            : "Histórico Geral"}
                        </TableCell>
                        <TableCell className="text-right">
                          {getDocumentHref({
                            type: doc.type,
                            employeeId: employee.id,
                            deliveryId: doc.deliveryId,
                            version: doc.version,
                          }) ? (
                            <Link
                              href={
                                getDocumentHref({
                                  type: doc.type,
                                  employeeId: employee.id,
                                  deliveryId: doc.deliveryId,
                                  version: doc.version,
                                })!
                              }
                              target="_blank"
                              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                            >
                              {getDocumentActionLabel(doc.type, doc.version)}
                            </Link>
                          ) : (
                            <span className="text-xs text-zinc-400">Indisponível</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sizing" className="space-y-6">
          <Card className="border-zinc-100 shadow-sm">
            <CardHeader>
              <CardTitle>Dados Cadastrais e Grade de Tamanhos</CardTitle>
              <CardDescription>Informações base para entregas futuras.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold tracking-widest text-zinc-400 uppercase">
                    Dados Pessoais
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-zinc-500 uppercase">CPF</p>
                      <p className="font-medium">{employee.documentId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 uppercase">Matrícula</p>
                      <p className="font-medium">{employee.registrationCode || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 uppercase">Status</p>
                      <p className="font-medium">{employee.active ? "Ativo" : "Inativo"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 uppercase">Admissão</p>
                      <p className="font-medium">
                        {format(new Date(employee.createdAt), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold tracking-widest text-zinc-400 uppercase">
                    Tamanhos
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="border-zinc-100 bg-zinc-50/50 py-4 text-center shadow-none">
                      <p className="text-xs text-zinc-500 uppercase">Camisa</p>
                      <p className="text-xl font-bold">{employee.shirtSize || "—"}</p>
                    </Card>
                    <Card className="border-zinc-100 bg-zinc-50/50 py-4 text-center shadow-none">
                      <p className="text-xs text-zinc-500 uppercase">Calça</p>
                      <p className="text-xl font-bold">{employee.pantsSize || "—"}</p>
                    </Card>
                    <Card className="border-zinc-100 bg-zinc-50/50 py-4 text-center shadow-none">
                      <p className="text-xs text-zinc-500 uppercase">Calçado</p>
                      <p className="text-xl font-bold">{employee.shoeSize || "—"}</p>
                    </Card>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
