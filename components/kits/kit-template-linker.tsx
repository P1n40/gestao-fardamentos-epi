"use client";

import { Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getActionErrorMessage } from "@/lib/action-errors";
import { linkKitTemplateToPositionAction } from "@/modules/kits/templates-actions";

interface TemplateOption {
  id: string;
  name: string;
  items: Array<{ id: string }>;
}

interface PositionOption {
  id: string;
  name: string;
  active: boolean;
}

export function KitTemplateLinker({
  templates,
  positions,
}: {
  templates: TemplateOption[];
  positions: PositionOption[];
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await linkKitTemplateToPositionAction(formData);

      if (result.error) {
        toast.error(getActionErrorMessage(result.error, "Nao foi possivel vincular o modelo."));
        return;
      }

      toast.success("Rascunho criado para o cargo.");
      router.push(`/materiais/kits/${result.positionId}?revisionId=${result.revisionId}`);
    } catch {
      toast.error("Erro inesperado ao vincular modelo.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5 rounded-lg border bg-white p-5">
      <div className="grid gap-2">
        <Label>Modelo de Kit</Label>
        <Select name="templateId" required>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione um modelo" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name} ({template.items.length} itens)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Cargo</Label>
        <Select name="positionId" required>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione o cargo" />
          </SelectTrigger>
          <SelectContent>
            {positions.map((position) => (
              <SelectItem key={position.id} value={position.id}>
                {position.name}
                {!position.active ? " (inativo)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isSaving || templates.length === 0 || positions.length === 0}>
        <Link2 className="mr-2 h-4 w-4" />
        {isSaving ? "Vinculando..." : "Criar rascunho no cargo"}
      </Button>
    </form>
  );
}
