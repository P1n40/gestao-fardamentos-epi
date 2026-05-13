import { Briefcase, Package } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth-server";
import { userHasPermission } from "@/lib/rbac";

const sections = [
  {
    title: "Catalogo de Materiais",
    description: "Gerenciar fardamentos, EPIs, tamanhos, SKUs e importacoes.",
    href: "/materiais/catalogo",
    icon: Package,
    permission: "MANAGE_MATERIALS" as const,
  },
  {
    title: "Kits",
    description: "Criar modelos reutilizaveis, importar em massa e vincular a cargos.",
    href: "/materiais/kits",
    icon: Briefcase,
    permission: "MANAGE_POSITIONS" as const,
  },
];

export default async function MateriaisPage() {
  const session = await requireAuth();
  const visibleSections = [];

  for (const section of sections) {
    if (await userHasPermission(session.user.id, section.permission)) {
      visibleSections.push(section);
    }
  }

  if (visibleSections.length === 0) {
    redirect("/unauthorized");
  }

  return (
    <main className="mx-auto max-w-7xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Materiais</h1>
        <p className="text-muted-foreground">Catalogo, kits e importacoes de materiais.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visibleSections.map((section) => (
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
