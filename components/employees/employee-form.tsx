"use client";

import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { OperationFeedback } from "@/components/shared/operation-feedback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getActionErrorMessage } from "@/lib/action-errors";
import { createEmployee, updateEmployee } from "@/modules/colaboradores/actions";

interface Position {
  id: string;
  name: string;
  department: string | null;
}

interface EmployeeFormProps {
  employee?: {
    id: string;
    name: string;
    documentId: string;
    registrationCode: string | null;
    department: string | null;
    positionId: string;
    shirtSize: string | null;
    pantsSize: string | null;
    shoeSize: string | null;
  };
  positions: Position[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeForm({ employee, positions, open, onOpenChange }: EmployeeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    const formData = new FormData(e.currentTarget);

    try {
      const result = employee
        ? await updateEmployee(employee.id, formData)
        : await createEmployee(formData);

      if (result.error) {
        const message = getActionErrorMessage(
          result.error,
          "Nao foi possivel salvar o colaborador.",
        );
        setFeedback(message);
        toast.error(message);
      } else {
        toast.success(employee ? "Colaborador atualizado!" : "Colaborador cadastrado!");
        onOpenChange(false);
      }
    } catch {
      const message = "Erro inesperado ao salvar colaborador.";
      setFeedback(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{employee ? "Editar Colaborador" : "Cadastrar Colaborador"}</DialogTitle>
            <DialogDescription>
              Insira os dados pessoais e profissionais do colaborador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {feedback && (
              <OperationFeedback
                title="Nao foi possivel salvar"
                message={feedback}
                variant="error"
              />
            )}
            {isLoading && (
              <OperationFeedback
                title="Salvando cadastro"
                message="Validando dados e persistindo o colaborador no sistema."
                variant="loading"
              />
            )}
          </div>
          <div className="grid gap-4 pb-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                name="name"
                defaultValue={employee?.name}
                placeholder="Ex: João da Silva"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="documentId">CPF (Apenas números)</Label>
              <Input
                id="documentId"
                name="documentId"
                defaultValue={employee?.documentId}
                placeholder="000.000.000-00"
                required
                maxLength={14}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="registrationCode">Matrícula</Label>
              <Input
                id="registrationCode"
                name="registrationCode"
                defaultValue={employee?.registrationCode || ""}
                placeholder="Ex: 12345"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="positionId">Cargo</Label>
              <Select name="positionId" defaultValue={employee?.positionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((pos) => (
                    <SelectItem key={pos.id} value={pos.id}>
                      {pos.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="department">Secretaria / Setor</Label>
              <Input
                id="department"
                name="department"
                defaultValue={employee?.department || ""}
                placeholder="Ex: Obras, Saúde"
              />
            </div>

            <div className="border-t pt-2 sm:col-span-2">
              <h4 className="mb-3 text-sm font-medium">Tamanhos / Numeração</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="shirtSize">Camisa</Label>
                  <Input
                    id="shirtSize"
                    name="shirtSize"
                    defaultValue={employee?.shirtSize || ""}
                    placeholder="P, M, G..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pantsSize">Calça</Label>
                  <Input
                    id="pantsSize"
                    name="pantsSize"
                    defaultValue={employee?.pantsSize || ""}
                    placeholder="38, 40, 42..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="shoeSize">Calçado</Label>
                  <Input
                    id="shoeSize"
                    name="shoeSize"
                    defaultValue={employee?.shoeSize || ""}
                    placeholder="39, 40, 41..."
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
