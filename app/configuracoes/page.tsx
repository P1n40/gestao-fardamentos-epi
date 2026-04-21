import { History, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth-server";

const sections = [
  {
    title: "Usuários",
    description: "Gerenciar contas, status e perfil associado.",
    href: "/configuracoes/usuarios",
    icon: Users,
  },
  {
    title: "Perfis & Permissões",
    description: "Definir permissões herdadas por perfil.",
    href: "/configuracoes/perfis",
    icon: ShieldCheck,
  },
  {
    title: "Manutenção do Sistema",
    description: "Executar ações administrativas críticas.",
    href: "/configuracoes/manutencao",
    icon: SlidersHorizontal,
  },
  {
    title: "Auditoria & Segurança",
    description: "Consultar trilhas de auditoria e eventos sensíveis.",
    href: "/configuracoes/auditoria-seguranca",
    icon: History,
  },
];

export default async function ConfiguracoesPage() {
  await requirePermission("MANAGE_USERS");

  return (
    <main className="mx-auto max-w-7xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Administração de acesso, segurança e manutenção.</p>
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
