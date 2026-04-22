"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit2,
  Search,
  Plus,
  UserCircle2,
  Power,
  PowerOff,
  ClipboardList,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchDeliveriesQuery, fetchEmployeesQuery } from "@/lib/query/fetchers";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";
import { toggleEmployeeStatus } from "@/modules/colaboradores/actions";

import { EmployeeForm } from "./employee-form";

interface Position {
  id: string;
  name: string;
  department: string | null;
}

interface Employee {
  id: string;
  name: string;
  documentId: string;
  registrationCode: string | null;
  department: string | null;
  positionId: string;
  position: { name: string };
  active: boolean;
  shirtSize: string | null;
  pantsSize: string | null;
  shoeSize: string | null;
}

interface EmployeeListProps {
  initialEmployees: Employee[];
  positions: Position[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export function EmployeeList({
  initialEmployees,
  positions,
  totalItems,
  totalPages,
  currentPage,
}: EmployeeListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [debouncedSearch] = useDebounce(searchTerm, 500);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | undefined>();
  const status =
    searchParams.get("status") === "active" || searchParams.get("status") === "inactive"
      ? searchParams.get("status")!
      : "all";
  const queryParams = {
    search: searchParams.get("search") || undefined,
    positionId: searchParams.get("position") || undefined,
    status: status as "active" | "inactive" | "all",
    page: currentPage,
    pageSize: 10,
  };
  const employeesQuery = useQuery({
    queryKey: queryKeys.employees(queryParams),
    queryFn: () => fetchEmployeesQuery(queryParams),
    initialData: {
      items: initialEmployees,
      total: totalItems,
      page: currentPage,
      pageSize: 10,
      totalPages,
    },
  });
  const employees = employeesQuery.data.items as Employee[];

  // Synchronize URL with debounced search
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }
    params.set("page", "1"); // Reset to page 1 on new search

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }, [debouncedSearch, pathname, router, searchParams]);

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.deliveries({ limit: 50 }),
      queryFn: () => fetchDeliveriesQuery({ limit: 50 }),
    });
  }, [queryClient]);

  const handleFilterChange = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // Reset on filter change

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  async function handleToggleStatus(id: string) {
    try {
      const result = await toggleEmployeeStatus(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Status atualizado!");
        await queryClient.invalidateQueries({ queryKey: ["employees"] });
      }
    } catch {
      toast.error("Erro ao alterar status");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative w-full sm:w-72">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="Nome, CPF ou Matrícula..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select
            value={searchParams.get("position") || "all"}
            onValueChange={(v) => handleFilterChange("position", v)}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Cargos</SelectItem>
              {positions.map((pos) => (
                <SelectItem key={pos.id} value={pos.id}>
                  {pos.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={searchParams.get("status") || "all"}
            onValueChange={(v) => handleFilterChange("status", v)}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status: Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            setSelectedEmployee(undefined);
            setIsFormOpen(true);
          }}
          disabled={isPending}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Colaborador
        </Button>
      </div>

      <div
        className={`overflow-hidden rounded-md border bg-white ${isPending ? "opacity-50" : ""}`}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Colaborador</TableHead>
              <TableHead>Documentos</TableHead>
              <TableHead>Cargo / Setor</TableHead>
              <TableHead>Tamanhos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length > 0 ? (
              employees.map((emp) => (
                <TableRow key={emp.id} className={!emp.active ? "bg-muted/30 opacity-60" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                        <UserCircle2 className="h-6 w-6" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">{emp.name}</span>
                        <span className="text-muted-foreground text-xs">
                          ID: {emp.id.slice(-6)}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1 text-xs">
                      <span>
                        <span className="font-medium">CPF:</span> {emp.documentId}
                      </span>
                      {emp.registrationCode && (
                        <span>
                          <span className="font-medium">Mat:</span> {emp.registrationCode}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{emp.position.name}</span>
                      {emp.department && (
                        <span className="text-muted-foreground text-xs">{emp.department}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 font-mono text-[10px]">
                      {emp.shirtSize && (
                        <Badge variant="outline" className="h-5 px-1">
                          C:{emp.shirtSize}
                        </Badge>
                      )}
                      {emp.pantsSize && (
                        <Badge variant="outline" className="h-5 px-1">
                          P:{emp.pantsSize}
                        </Badge>
                      )}
                      {emp.shoeSize && (
                        <Badge variant="outline" className="h-5 px-1">
                          S:{emp.shoeSize}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={emp.active ? "default" : "secondary"}>
                      {emp.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Link
                        href={`/colaboradores/${emp.id}/ficha-epi`}
                        target="_blank"
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                        title="Ficha EPI (Histórico)"
                      >
                        <Shield className="h-4 w-4 text-orange-600" />
                      </Link>
                      <Link
                        href={`/colaboradores/${emp.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                        title="Ver Ficha/Histórico"
                      >
                        <ClipboardList className="h-4 w-4" />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setIsFormOpen(true);
                        }}
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleStatus(emp.id)}
                        className={emp.active ? "text-amber-600" : "text-green-600"}
                        title={emp.active ? "Inativar" : "Ativar"}
                      >
                        {emp.active ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  Nenhum colaborador encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 py-2 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
        <div>
          Mostrando {employees.length} de {employeesQuery.data.total} colaboradores
        </div>
        <Pagination
          currentPage={employeesQuery.data.page}
          totalPages={employeesQuery.data.totalPages}
          onPageChange={handlePageChange}
        />
      </div>

      <EmployeeForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        employee={selectedEmployee}
        positions={positions}
      />
    </div>
  );
}
