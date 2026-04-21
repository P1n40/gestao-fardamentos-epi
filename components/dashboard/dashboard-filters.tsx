"use client";

import { FilterX, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DashboardFilterOptions } from "@/modules/dashboard/services";

interface DashboardFiltersProps {
  options: DashboardFilterOptions;
  selected: {
    department?: string;
    positionId?: string;
    period: string;
  };
}

export function DashboardFilters({ options, selected }: DashboardFiltersProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/dashboard";
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    startTransition(() => {
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  };

  const clearFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasFilters = Boolean(selected.department || selected.positionId || selected.period !== "current_month");

  return (
    <div className={`space-y-3 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm ${isPending ? "opacity-70" : ""}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros do dashboard
        </div>

        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={clearFilters} disabled={isPending} className="w-full lg:w-auto">
            <FilterX className="mr-2 h-4 w-4" />
            Limpar filtros
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Select
          value={selected.department || "all"}
          onValueChange={(value) => updateFilter("department", value)}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="Secretaria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as secretarias</SelectItem>
            {options.departments.map((department) => (
              <SelectItem key={department.value} value={department.value}>
                {department.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selected.positionId || "all"}
          onValueChange={(value) => updateFilter("positionId", value)}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="Cargo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os cargos</SelectItem>
            {options.positions.map((position) => (
              <SelectItem key={position.value} value={position.value}>
                {position.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selected.period} onValueChange={(value) => updateFilter("period", value)}>
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            {options.periods.map((period) => (
              <SelectItem key={period.value} value={period.value}>
                {period.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
