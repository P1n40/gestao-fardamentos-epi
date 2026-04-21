import { ShieldX } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-4 text-center">
      <div className="bg-destructive/10 mb-6 rounded-full p-6">
        <ShieldX className="text-destructive h-16 w-16" />
      </div>
      <h1 className="mb-2 text-4xl font-bold tracking-tight">Acesso Negado</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        Você não tem as permissões necessárias para acessar esta página. Se você acredita que isso é
        um erro, entre em contato com o administrador do sistema.
      </p>
      <div className="flex gap-4">
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          Voltar para o Início
        </Link>
        <Link href="/auth/login" className={cn(buttonVariants({ variant: "default" }))}>
          Trocar de Conta
        </Link>
      </div>
    </div>
  );
}
