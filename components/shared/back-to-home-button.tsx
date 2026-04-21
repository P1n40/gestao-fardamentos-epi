"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const HIDDEN_PREFIXES = ["/auth/login", "/api"];

export function BackToHomeButton() {
  const pathname = usePathname();

  if (
    pathname === APP_ROUTES.home ||
    HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <Link
        href={APP_ROUTES.home}
        aria-label="Voltar para a página principal"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2 text-zinc-600")}
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o início
      </Link>
    </div>
  );
}
