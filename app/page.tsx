import Image from "next/image";
import Link from "next/link";

import { RoleGuard } from "@/components/auth/role-guard";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-24 dark:bg-zinc-950">
      <div className="relative mt-12 mb-12 flex flex-col items-center">
        <Image src="/logo.png" alt="Logo da Empresa" width={360} height={130} className="mb-8" />
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
          Bem-vindo ao Sistema
        </h1>
      </div>

      <div className="mb-32 grid gap-4 text-center lg:mb-0 lg:grid-cols-4 lg:text-left">
        <RoleGuard permissions={["VIEW_DASHBOARD"]}>
          <Link
            href="/dashboard"
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          >
            <h2 className="mb-3 text-2xl font-semibold">
              Dashboard{" "}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                -&gt;
              </span>
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Visão geral de estoque, entregas e pendências.
            </p>
          </Link>
        </RoleGuard>

        <RoleGuard permissions={["MANAGE_EMPLOYEES"]}>
          <Link
            href="/colaboradores"
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          >
            <h2 className="mb-3 text-2xl font-semibold">
              Colaboradores{" "}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                -&gt;
              </span>
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Gestão de funcionários, cargos e kits.
            </p>
          </Link>
        </RoleGuard>

        <RoleGuard permissions={["MANAGE_MATERIALS"]}>
          <a
            href="/materiais"
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          >
            <h2 className="mb-3 text-2xl font-semibold">
              Estoque{" "}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                -&gt;
              </span>
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Controle de fardamentos e equipamentos.
            </p>
          </a>
        </RoleGuard>

        <RoleGuard permissions={["MANAGE_ASSIGNMENTS"]}>
          <a
            href="/entregas"
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          >
            <h2 className="mb-3 text-2xl font-semibold">
              Entregas{" "}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                -&gt;
              </span>
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Registro de fardamentos e EPIs entregues.
            </p>
          </a>
        </RoleGuard>
      </div>
    </main>
  );
}
