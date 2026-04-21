"use client";

import { Edit2, Power, PowerOff, Search, Plus, Package } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { togglePositionStatus } from "@/modules/posicoes/actions";

import { PositionForm } from "./position-form";

interface Position {
  id: string;
  name: string;
  description: string | null;
  department: string | null;
  requiresUniform: boolean;
  requiresPPE: boolean;
  active: boolean;
  createdAt: Date;
}

interface PositionListProps {
  initialPositions: Position[];
}

export function PositionList({ initialPositions }: PositionListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | undefined>();

  const filtered = initialPositions.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.department?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  async function handleToggleStatus(id: string) {
    try {
      const result = await togglePositionStatus(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Status atualizado com sucesso!");
      }
    } catch {
      toast.error("Erro ao alterar status");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div className="relative w-full sm:max-w-sm">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Pesquisar cargos..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          onClick={() => {
            setSelectedPosition(undefined);
            setIsFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Cargo
        </Button>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((pos) => (
                <TableRow key={pos.id} className={!pos.active ? "bg-muted/30 opacity-60" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{pos.name}</span>
                      <div className="mt-1 flex gap-1">
                        {pos.requiresUniform && (
                          <Badge variant="outline" className="text-[10px] text-blue-600">
                            Fardamento
                          </Badge>
                        )}
                        {pos.requiresPPE && (
                          <Badge variant="outline" className="text-[10px] text-orange-600">
                            EPI
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{pos.department || "N/A"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={pos.active ? "default" : "secondary"}
                      className={pos.active ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      {pos.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(pos.createdAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Link
                      href={`/cargos/${pos.id}/kit`}
                      className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                      title="Gerenciar Kit"
                    >
                      <Package className="h-4 w-4" />
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedPosition(pos);
                        setIsFormOpen(true);
                      }}
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleStatus(pos.id)}
                      className={pos.active ? "text-amber-600" : "text-green-600"}
                      title={pos.active ? "Inativar" : "Ativar"}
                    >
                      {pos.active ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Nenhum cargo encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PositionForm open={isFormOpen} onOpenChange={setIsFormOpen} position={selectedPosition} />
    </div>
  );
}
