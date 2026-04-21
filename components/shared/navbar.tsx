"use client";

import {
  Briefcase,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShieldAlert,
  User as UserIcon,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import { RoleGuard } from "@/components/auth/role-guard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Colaboradores", href: "/colaboradores", icon: Users },
  { name: "Materiais", href: "/materiais", icon: Package },
  { name: "Estoque", href: "/estoque", icon: Package },
  { name: "Entregas", href: "/entregas", icon: ShieldAlert },
];

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (pathname === "/auth/login") {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b bg-white p-4 dark:bg-zinc-950">
      <div className="flex items-center gap-2 text-lg font-bold">
        <Image src="/logo.png" alt="Logo da Empresa" width={92} height={34} />
        <span className="hidden font-sans font-bold tracking-tight lg:inline">
          Gestão Fardamento & EPI
        </span>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "hover:text-primary flex items-center gap-1.5 text-sm font-medium transition-colors",
              pathname === link.href
                ? "text-primary font-semibold"
                : "text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-100",
            )}
          >
            <link.icon className="h-4 w-4" />
            <span className="hidden md:inline">{link.name}</span>
          </Link>
        ))}
        <RoleGuard permissions={["MANAGE_POSITIONS"]}>
          <Link
            href="/cargos"
            className={cn(
              "hover:text-primary flex items-center gap-1.5 text-sm font-medium transition-colors",
              pathname === "/cargos"
                ? "text-primary font-semibold"
                : "text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-100",
            )}
          >
            <Briefcase className="h-4 w-4" />
            <span className="hidden md:inline">Cargos</span>
          </Link>
        </RoleGuard>
        <RoleGuard permissions={["MANAGE_USERS"]}>
          <Link
            href="/configuracoes"
            className={cn(
              "hover:text-primary flex items-center gap-1.5 text-sm font-medium transition-colors",
              pathname.startsWith("/configuracoes")
                ? "text-primary font-semibold"
                : "text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-100",
            )}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden md:inline">Configurações</span>
          </Link>
        </RoleGuard>
      </div>

      <div className="flex items-center gap-3 border-l pl-4 md:pl-6">
        {session?.user && (
          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end text-xs sm:flex">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {session.user.name}
              </span>
              <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                {session.user.role}
              </span>
            </div>
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full">
              <UserIcon className="h-4 w-4" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              title="Sair"
            >
              <LogOut className="hover:text-destructive h-4 w-4 text-zinc-500 transition-colors" />
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
