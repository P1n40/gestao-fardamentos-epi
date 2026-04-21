"use client";

import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { getActionErrorMessage } from "@/lib/action-errors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createMaterial, updateMaterial } from "@/modules/estoque/actions";

interface MaterialFormProps {
  material?: {
    id: string;
    name: string;
    description: string | null;
    category: "UNIFORM" | "PPE";
    unit: string;
    size: string | null;
    sku: string | null;
    caNumber: string | null;
    stock: number;
    minStock: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaterialForm({ material, open, onOpenChange }: MaterialFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    const formData = new FormData(e.currentTarget);

    try {
      const result = material
        ? await updateMaterial(material.id, formData)
        : await createMaterial(formData);

      if (result.error) {
        const message = getActionErrorMessage(result.error, "Nao foi possivel salvar o material.");
        setFeedback(message);
        toast.error(message);
      } else {
        toast.success(material ? "Material atualizado!" : "Material criado!");
        onOpenChange(false);
        router.refresh();
      }
    } catch {
      const message = "Erro inesperado ao salvar material.";
      setFeedback(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{material ? "Editar Material" : "Novo Material"}</DialogTitle>
            <DialogDescription>Preencha os detalhes do material para o catálogo.</DialogDescription>
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
                title="Salvando material"
                message="Aplicando validacoes de cadastro e preparando o catalogo."
                variant="loading"
              />
            </div>
          )}
          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="name">Nome do Material</Label>
              <Input
                id="name"
                name="name"
                defaultValue={material?.name}
                placeholder="Ex: Camiseta Brim Cinza"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Categoria</Label>
              <Select name="category" defaultValue={material?.category || "UNIFORM"}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNIFORM">Fardamento</SelectItem>
                  <SelectItem value="PPE">EPI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="unit">Unidade de Medida</Label>
              <Select name="unit" defaultValue={material?.unit || "UN"}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UN">Unidade (UN)</SelectItem>
                  <SelectItem value="PAR">Par (PAR)</SelectItem>
                  <SelectItem value="KG">Quilo (KG)</SelectItem>
                  <SelectItem value="MT">Metro (MT)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sku">SKU / Código Interno</Label>
              <Input id="sku" name="sku" defaultValue={material?.sku || ""} placeholder="M-001" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="caNumber">Número do CA (EPI)</Label>
              <Input
                id="caNumber"
                name="caNumber"
                defaultValue={material?.caNumber || ""}
                placeholder="Obrigatório para EPIs"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="size">Tamanho / Numeração</Label>
              <Input
                id="size"
                name="size"
                defaultValue={material?.size || ""}
                placeholder="Ex: P, M, 42, G"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="stock">
                {material ? "Estoque Atual (Somente Leitura)" : "Estoque Inicial"}
              </Label>
              <Input
                id="stock"
                name="stock"
                type="number"
                defaultValue={material?.stock || 0}
                required
                disabled={!!material}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="minStock">Estoque Mínimo</Label>
              <Input
                id="minStock"
                name="minStock"
                type="number"
                defaultValue={material?.minStock || 0}
                required
              />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="description">Descrição / Observações</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={material?.description || ""}
                placeholder="Detalhes adicionais sobre o material"
                rows={3}
              />
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
