"use client";

import { Save } from "lucide-react";
import { useState, useTransition } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { addStockMovement } from "@/modules/estoque/actions";

interface StockMovementDialogProps {
  materialId?: string;
  materialName?: string;
  currentStock: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockMovementDialog({
  materialId,
  materialName,
  currentStock,
  open,
  onOpenChange,
}: StockMovementDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<"INPUT" | "OUTPUT" | "ADJUSTMENT">("INPUT");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!materialId) return;
    setFeedback(null);

    const formData = new FormData();
    formData.append("materialId", materialId);
    formData.append("type", type);

    const parsedQuantity = parseInt(quantity);
    let finalQuantity = parsedQuantity;

    if (type === "OUTPUT") {
      finalQuantity = -Math.abs(parsedQuantity);
    } else if (type === "INPUT") {
      finalQuantity = Math.abs(parsedQuantity);
    }

    const projectedStock = currentStock + finalQuantity;
    if (projectedStock < 0) {
      const message = `Operacao cancelada: o saldo nao pode ficar negativo (resultado projetado: ${projectedStock}).`;
      setFeedback(message);
      toast.error(message);
      return;
    }

    formData.append("quantity", finalQuantity.toString());
    formData.append("reason", reason);
    formData.append("notes", notes);

    startTransition(async () => {
      const result = await addStockMovement(formData);

      if (result.error) {
        const message = typeof result.error === "string" ? result.error : "Erro ao registrar";
        setFeedback(message);
        toast.error(message);
        return;
      }

      toast.success("Movimentacao registrada com sucesso!");
      onOpenChange(false);
      setQuantity("1");
      setReason("");
      setNotes("");
      setFeedback(null);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Movimentar Estoque</DialogTitle>
          <DialogDescription>
            Registre uma entrada, saida ou ajuste para <strong>{materialName}</strong>.
            <br />
            Saldo atual: <span className="text-primary font-bold">{currentStock}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {feedback && (
            <OperationFeedback
              title="Movimentacao nao concluida"
              message={feedback}
              variant="error"
            />
          )}
          {isPending && (
            <OperationFeedback
              title="Registrando movimentacao"
              message="Atualizando saldo, historico e trilha de auditoria do material."
              variant="loading"
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Movimento</Label>
              <Select
                value={type}
                onValueChange={(value) => {
                  if (value) {
                    setType(value as "INPUT" | "OUTPUT" | "ADJUSTMENT");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INPUT">Entrada (+)</SelectItem>
                  <SelectItem value="OUTPUT">Saida (-)</SelectItem>
                  <SelectItem value="ADJUSTMENT">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Justificativa / Motivo</Label>
            <Input
              placeholder="Ex: NF 123, perda operacional, ajuste de inventario"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Observacoes (Opcional)</Label>
            <Textarea
              placeholder="Detalhes adicionais sobre a movimentacao..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Processando..." : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Registrar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
