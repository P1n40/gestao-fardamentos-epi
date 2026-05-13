"use client";

import { Edit2, PackagePlus, Plus, Power, PowerOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getActionErrorMessage } from "@/lib/action-errors";
import { cn } from "@/lib/utils";
import {
  createKitTemplateAction,
  toggleKitTemplateStatusAction,
  updateKitTemplateAction,
} from "@/modules/kits/templates-actions";

interface KitTemplateItem {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  itemCount: number;
  linkCount: number;
}

export function KitTemplateList({ templates }: { templates: KitTemplateItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<KitTemplateItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function openCreateDialog() {
    setSelectedTemplate(null);
    setOpen(true);
  }

  function openEditDialog(template: KitTemplateItem) {
    setSelectedTemplate(template);
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);

    try {
      const result = selectedTemplate
        ? await updateKitTemplateAction(selectedTemplate.id, formData)
        : await createKitTemplateAction(formData);

      if (result.error) {
        toast.error(getActionErrorMessage(result.error, "Nao foi possivel salvar o modelo."));
        return;
      }

      toast.success(selectedTemplate ? "Modelo atualizado." : "Modelo criado.");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Erro inesperado ao salvar modelo.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleStatus(template: KitTemplateItem) {
    try {
      const result = await toggleKitTemplateStatusAction(template.id);

      if (result.error) {
        toast.error(getActionErrorMessage(result.error, "Nao foi possivel alterar o status."));
        return;
      }

      toast.success(template.active ? "Modelo inativado." : "Modelo ativado.");
      router.refresh();
    } catch {
      toast.error("Erro inesperado ao alterar status.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Modelo
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Modelo</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Vínculos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length > 0 ? (
              templates.map((template) => (
                <TableRow
                  key={template.id}
                  className={!template.active ? "bg-muted/30 opacity-70" : ""}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{template.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {template.description || "Sem descrição"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{template.itemCount}</TableCell>
                  <TableCell>{template.linkCount}</TableCell>
                  <TableCell>
                    <Badge variant={template.active ? "default" : "secondary"}>
                      {template.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/materiais/kits/modelos/${template.id}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                        title="Editar itens"
                      >
                        <PackagePlus className="h-4 w-4" />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(template)}
                        title="Editar modelo"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={template.active ? "text-amber-600" : "text-green-600"}
                        onClick={() => handleToggleStatus(template)}
                        title={template.active ? "Inativar" : "Ativar"}
                      >
                        {template.active ? (
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
                <TableCell colSpan={5} className="h-24 text-center">
                  Nenhum modelo de kit cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form key={selectedTemplate?.id ?? "new"} onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{selectedTemplate ? "Editar Modelo" : "Novo Modelo"}</DialogTitle>
              <DialogDescription>
                Defina o nome e a descrição do modelo reutilizável de kit.
              </DialogDescription>
            </DialogHeader>

            <input
              type="hidden"
              name="active"
              value={selectedTemplate?.active === false ? "false" : "true"}
            />

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" defaultValue={selectedTemplate?.name ?? ""} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={selectedTemplate?.description ?? ""}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
