"use client";

import { Loader2, Save, ShoppingBag, ShieldCheck } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { getActionErrorMessage } from "@/lib/action-errors";
import { createPosition, updatePosition } from "@/modules/posicoes/actions";

interface PositionFormProps {
  position?: {
    id: string;
    name: string;
    description: string | null;
    department: string | null;
    requiresUniform: boolean;
    requiresPPE: boolean;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PositionForm({ position, open, onOpenChange }: PositionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    const formData = new FormData(e.currentTarget);

    try {
      const result = position
        ? await updatePosition(position.id, formData)
        : await createPosition(formData);

      if (result.error) {
        const message = getActionErrorMessage(result.error, "Nao foi possivel salvar o cargo.");
        setFeedback(message);
        toast.error(message);
      } else {
        toast.success(position ? "Cargo atualizado!" : "Cargo criado!");
        onOpenChange(false);
      }
    } catch {
      const message = "Erro inesperado ao salvar cargo.";
      setFeedback(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{position ? "Editar Cargo" : "Novo Cargo"}</DialogTitle>
            <DialogDescription>Preencha os dados do cargo para o sistema.</DialogDescription>
          </DialogHeader>
          {feedback && (
            <div className="py-4">
              <OperationFeedback
                title="Nao foi possivel salvar"
                message={feedback}
                variant="error"
              />
            </div>
          )}
          {isLoading && (
            <div className={feedback ? "pb-4" : "py-4"}>
              <OperationFeedback
                title="Salvando cargo"
                message="Atualizando regras de exigencia e dados estruturais do cargo."
                variant="loading"
              />
            </div>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Cargo</Label>
              <Input
                id="name"
                name="name"
                defaultValue={position?.name}
                placeholder="Ex: Operador de Máquina"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="department">Departamento</Label>
              <Input
                id="department"
                name="department"
                defaultValue={position?.department || ""}
                placeholder="Ex: Produção"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                name="description"
                defaultValue={position?.description || ""}
                placeholder="Breve descrição das funções"
              />
            </div>
            <div className="bg-muted/30 mt-2 grid gap-4 rounded-lg border p-4">
              <p className="muted-foreground text-xs font-bold tracking-widest uppercase">
                Regras de Exigência
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-blue-600" />
                  <div className="grid gap-0.5">
                    <Label htmlFor="requiresUniform" className="text-sm font-semibold">
                      Exige Fardamento
                    </Label>
                    <p className="muted-foreground text-[10px]">
                      O cargo necessita de uniforme padrão.
                    </p>
                  </div>
                </div>
                <Switch
                  id="requiresUniform"
                  name="requiresUniform"
                  defaultChecked={position ? position.requiresUniform : true}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-orange-600" />
                  <div className="grid gap-0.5">
                    <Label htmlFor="requiresPPE" className="text-sm font-semibold">
                      Exige EPI
                    </Label>
                    <p className="muted-foreground text-[10px]">
                      O cargo envolve riscos e exige proteção.
                    </p>
                  </div>
                </div>
                <Switch
                  id="requiresPPE"
                  name="requiresPPE"
                  defaultChecked={position ? position.requiresPPE : false}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
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
