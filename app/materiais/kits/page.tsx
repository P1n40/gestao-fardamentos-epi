import { FileSpreadsheet, Link2, PackagePlus } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth-server";

const sections = [
  {
    title: "Modelos de Kit",
    description: "Criar kits reutilizáveis com materiais do catálogo.",
    href: "/materiais/kits/modelos",
    icon: PackagePlus,
  },
  {
    title: "Vincular a Cargo",
    description: "Gerar rascunho de kit para um cargo a partir de um modelo.",
    href: "/materiais/kits/vincular",
    icon: Link2,
  },
  {
    title: "Importação em Massa",
    description: "Criar ou atualizar modelos de kit via planilha.",
    href: "/materiais/kits/importacao",
    icon: FileSpreadsheet,
  },
];

export default async function MaterialKitsPage() {
  await requirePermission("MANAGE_POSITIONS");

  return (
    <main className="mx-auto max-w-7xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Kits de Materiais</h1>
        <p className="text-muted-foreground">
          Crie modelos reutilizáveis, importe em massa e vincule kits aos cargos desejados.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="hover:bg-muted/50 h-full transition-colors">
              <CardHeader className="flex flex-row items-center gap-3">
                <section.icon className="h-5 w-5" />
                <div>
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="text-sm font-medium">Acessar</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
