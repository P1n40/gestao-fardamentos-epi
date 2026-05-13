"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { getActionErrorMessage } from "@/lib/action-errors";
import {
  removeKitTemplateItemAction,
  saveKitTemplateItemAction,
} from "@/modules/kits/templates-actions";

interface Material {
  id: string;
  name: string;
  category: "UNIFORM" | "PPE";
  unit: string;
  size: string | null;
  sku: string | null;
}

interface TemplateItem {
  id: string;
  materialId: string;
  quantity: number;
  periodDays: number | null;
  mandatory: boolean;
  material: Material;
}

export function KitTemplateEditor({
  templateId,
  items,
  materials,
}: {
  templateId: string;
  items: TemplateItem[];
  materials: Material[];
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    formData.set("templateId", templateId);

    try {
      const result = await saveKitTemplateItemAction(formData);

      if (result.error) {
        toast.error(getActionErrorMessage(result.error, "Nao foi possivel salvar o item."));
        return;
      }

      toast.success("Item salvo no modelo.");
      event.currentTarget.reset();
      router.refresh();
    } catch {
      toast.error("Erro inesperado ao salvar item.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(itemId: string) {
    try {
      const result = await removeKitTemplateItemAction(itemId, templateId);

      if (result.error) {
        toast.error(getActionErrorMessage(result.error, "Nao foi possivel remover o item."));
        return;
      }

      toast.success("Item removido.");
      router.refresh();
    } catch {
      toast.error("Erro inesperado ao remover item.");
    }
  }

  const usedMaterialIds = new Set(items.map((item) => item.materialId));

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-4">
        <div>
          <h2 className="text-lg font-semibold">Adicionar item</h2>
          <p className="text-muted-foreground text-sm">
            Inclua materiais do catálogo neste modelo.
          </p>
        </div>

        <div className="grid gap-2">
          <Label>Material</Label>
          <Select name="materialId" required>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um material" />
            </SelectTrigger>
            <SelectContent>
              {materials
                .filter((material) => !usedMaterialIds.has(material.id))
                .map((material) => (
                  <SelectItem key={material.id} value={material.id}>
                    {material.name}
                    {material.size ? ` (${material.size})` : ""}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="quantity">Quantidade</Label>
            <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} required />
          </div>
          <div className="grid gap-2">
            <Label>Obrigatório</Label>
            <Select name="mandatory" defaultValue="true">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="periodDays">Periodicidade em dias</Label>
          <Input id="periodDays" name="periodDays" type="number" min={0} placeholder="Opcional" />
        </div>

        <Button type="submit" disabled={isSaving} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          {isSaving ? "Salvando..." : "Adicionar ao modelo"}
        </Button>
      </form>

      <div className="overflow-hidden rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Periodicidade</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length > 0 ? (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{item.material.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {item.material.size || item.material.unit}
                        {item.material.sku ? ` | ${item.material.sku}` : ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {item.material.category === "UNIFORM" ? "Fardamento" : "EPI"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.quantity} {item.material.unit}
                    {!item.mandatory && (
                      <Badge variant="secondary" className="ml-2">
                        Opcional
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.periodDays ? `${item.periodDays} dias` : "Troca única"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => handleRemove(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Nenhum item adicionado a este modelo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
