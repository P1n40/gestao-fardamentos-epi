import { BarChart3, Package, ShieldCheck, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { RoleGuard } from "@/components/auth/role-guard";

const quickAccessLinks = [
  {
    title: "Dashboard",
    href: "/dashboard",
    description: "Visão geral de estoque, entregas e pendências.",
    permission: "VIEW_DASHBOARD" as const,
    icon: BarChart3,
  },
  {
    title: "Colaboradores",
    href: "/colaboradores",
    description: "Gestão de funcionários, cargos e kits.",
    permission: "MANAGE_EMPLOYEES" as const,
    icon: Users,
  },
  {
    title: "Materiais",
    href: "/materiais",
    description: "Catálogo de fardamentos e equipamentos.",
    permission: "MANAGE_MATERIALS" as const,
    icon: Package,
  },
  {
    title: "Entregas",
    href: "/entregas",
    description: "Registro de fardamentos e EPIs entregues.",
    permission: "MANAGE_ASSIGNMENTS" as const,
    icon: ShieldCheck,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 lg:px-8 dark:bg-zinc-950">
      <section className="mx-auto max-w-7xl overflow-hidden rounded-3xl border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative min-h-[360px] md:min-h-[460px]">
          <Image
            src="/home-hero.jpg"
            alt="Entrega operacional de fardamentos e EPIs em ambiente de almoxarifado"
            fill
            priority
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/45" aria-hidden="true" />

          <div className="relative z-10 flex min-h-[360px] flex-col justify-end p-6 text-white md:min-h-[460px] md:p-10 lg:p-12">
            <Image
              src="/logo.png"
              alt="Cactos Administração e Serviços"
              width={220}
              height={82}
              className="mb-8 h-auto w-44 md:w-56"
            />
            <p className="mb-3 text-sm font-semibold tracking-[0.2em] text-white/80 uppercase">
              Gestão de Fardamento & EPI
            </p>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
              Eficiência e Segurança em Cada Entrega
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/85 md:text-lg">
              Acesse rapidamente os fluxos operacionais para acompanhar estoque, colaboradores e
              entregas com rastreabilidade.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickAccessLinks.map((item) => (
          <RoleGuard key={item.href} permissions={[item.permission]}>
            <Link
              href={item.href}
              className="group rounded-2xl border bg-white p-5 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/70"
            >
              <div className="mb-4 flex items-center justify-between">
                <item.icon className="text-primary h-5 w-5" />
                <span className="text-lg transition-transform group-hover:translate-x-1">→</span>
              </div>
              <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {item.description}
              </p>
            </Link>
          </RoleGuard>
        ))}
      </section>
    </main>
  );
}
