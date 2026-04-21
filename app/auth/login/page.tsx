import Image from "next/image";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="bg-muted/50 flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/logo.png" alt="Logo da Empresa" width={260} height={95} className="mb-6" />
          <h1 className="text-primary text-3xl font-bold">Gestão de Fardamento & EPI</h1>
          <p className="text-muted-foreground mt-2">Sistema Interno de Controle</p>
        </div>
        <Suspense fallback={<div className="text-center">Carregando...</div>}>
          <LoginForm />
        </Suspense>
        <p className="text-muted-foreground mt-8 text-center text-xs">
          &copy; {new Date().getFullYear()} Empresa - Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
