"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { queryKeys } from "@/lib/query/keys";
import { initializeStock } from "@/modules/configuracoes/actions";

interface MaterialOption {
  id: string;
  name: string;
  unit: string;
  stock: number;
}

interface InitialStockItem {
  materialId: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export function InitialStockDialog({
  materials,
  open,
  onOpenChange,
}: {
  materials: MaterialOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<InitialStockItem[]>([
    { materialId: materials[0]?.id ?? "", quantity: 1, unit: materials[0]?.unit ?? "UN" },
  ]);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);

  const materialsById = useMemo(
    () => new Map(materials.map((material) => [material.id, material])),
    [materials],
  );

  function updateItem(index: number, nextItem: Partial<InitialStockItem>) {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const merged = { ...item, ...nextItem };
        if (nextItem.materialId) {
          merged.unit = materialsById.get(nextItem.materialId)?.unit ?? merged.unit;
        }
        return merged;
      }),
    );
  }

  async function handleSubmit() {
    const formData = new FormData();
    formData.set("reason", reason);
    formData.set("confirmation", confirmation);
    formData.set("items", JSON.stringify(items.filter((item) => item.materialId)));

    setPending(true);
    try {
      const result = await initializeStock(formData);
      if (result.error) {
        toast.error(
          typeof result.error === "string"
            ? result.error
            : "Verifique os campos da entrada inicial.",
        );
        return;
      }

      toast.success("Entrada inicial de estoque registrada.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.stockOverview() }),
        queryClient.invalidateQueries({ queryKey: ["materials"] }),
      ]);
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Entrada Inicial de Materiais</DialogTitle>
          <DialogDescription>
            Esta é a primeira carga oficial de estoque. Após confirmar, ela não poderá ser executada
            novamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_120px_100px]"
            >
              <div className="space-y-2">
                <Label>Material</Label>
                <select
                  className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                  value={item.materialId}
                  onChange={(event) => updateItem(index, { materialId: event.target.value })}
                >
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Input
                  value={item.unit}
                  onChange={(event) => updateItem(index, { unit: event.target.value })}
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setItems((current) => [
                ...current,
                {
                  materialId: materials[0]?.id ?? "",
                  quantity: 1,
                  unit: materials[0]?.unit ?? "UN",
                },
              ])
            }
          >
            Adicionar material
          </Button>

          <div className="space-y-2">
            <Label>Motivo obrigatório</Label>
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Confirmação final</Label>
            <Input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="Digite CONFIRMAR"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={pending || materials.length === 0}>
            {pending ? "Registrando..." : "Confirmar entrada inicial"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
