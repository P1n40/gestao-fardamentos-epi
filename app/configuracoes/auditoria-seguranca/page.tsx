import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth-server";

export default async function SecurityAuditPage() {
  await requirePermission("VIEW_SECURITY_AUDIT");

  return (
    <main className="mx-auto max-w-7xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Auditoria & Segurança</h1>
        <p className="text-muted-foreground">
          Acompanhe eventos sensíveis, acessos negados e ações administrativas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trilha de auditoria</CardTitle>
          <CardDescription>
            Os eventos críticos de usuários, perfis, importações, estoque e manutenção são
            registrados na trilha central.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/auditoria" className={buttonVariants()}>
            Abrir auditoria
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
