/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  Plus,
  ShoppingBag,
  Trash2,
  History,
  CheckCircle,
  AlertCircle,
  Calendar,
  Info,
  Pencil,
  X,
  Save,
  Copy,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  removeKitItem,
  saveKitItem,
  createNewKitVersion,
  publishKitVersion,
  updateKitNotes,
} from "@/modules/kits/actions";

export interface Material {
  id: string;
  name: string;
  category: "UNIFORM" | "PPE";
  unit: string;
  size: string | null;
  sku: string | null;
}

export interface KitItem {
  id: string;
  materialId: string;
  quantity: number;
  periodDays: number | null;
  mandatory: boolean;
  material: Material;
}

export interface KitRevision {
  id: string;
  version: number;
  notes: string | null;
  isActive: boolean;
  validFrom: Date;
  validTo: Date | null;
  items: KitItem[];
}

interface KitManagerProps {
  positionId: string;
  positionName: string;
  requiresUniform: boolean;
  requiresPPE: boolean;
  currentRevision: KitRevision | null;
  revisions: KitRevision[];
  availableMaterials: Material[];
}

export function KitManager({
  positionId,
  positionName,
  requiresUniform,
  requiresPPE,
  currentRevision,
  revisions,
  availableMaterials,
}: KitManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingItem, setEditingItem] = useState<KitItem | null>(null);
  const [notes, setNotes] = useState("");

  // Form States
  const [selectedMaterial, setSelectedMaterial] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [periodDays, setPeriodDays] = useState<string>("");
  const [mandatory, setMandatory] = useState<string>("true");

  useEffect(() => {
    if (currentRevision) {
      setNotes(currentRevision.notes || "");
    }
  }, [currentRevision]);

  const isDraft = currentRevision && !currentRevision.isActive && !currentRevision.validTo;

  const getMaterialVariantLabel = (material: Material) =>
    `${material.name}${material.size ? ` (${material.size})` : ""} - ${
      material.category === "UNIFORM" ? "Fardamento" : "EPI"
    }`;

  const getMaterialDetailLabel = (material: Material) => {
    const details = [material.size || material.unit, material.sku].filter(Boolean);
    return details.join(" | ");
  };

  const handleEditItem = (item: KitItem) => {
    setEditingItem(item);
    setSelectedMaterial(item.materialId);
    setQuantity(item.quantity.toString());
    setPeriodDays(item.periodDays?.toString() || "");
    setMandatory(item.mandatory.toString());
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setSelectedMaterial("");
    setQuantity("1");
    setPeriodDays("");
    setMandatory("true");
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial || !currentRevision) return;

    const formData = new FormData();
    formData.append("positionId", positionId);
    formData.append("revisionId", currentRevision.id);
    formData.append("materialId", selectedMaterial);
    formData.append("quantity", quantity);
    formData.append("periodDays", periodDays);
    formData.append("mandatory", mandatory);

    startTransition(async () => {
      const result = await saveKitItem(formData);
      if (result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Erro ao salvar item");
      } else {
        toast.success(editingItem ? "Item atualizado" : "Item adicionado");
        cancelEdit();
      }
    });
  };

  const handleRemoveItem = async (id: string) => {
    startTransition(async () => {
      const result = await removeKitItem(id, positionId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Item removido");
      }
    });
  };

  const handleSaveNotes = async () => {
    if (!currentRevision) return;
    startTransition(async () => {
      const result = await updateKitNotes(currentRevision.id, positionId, notes);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Notas atualizadas");
      }
    });
  };

  const handleCreateVersion = async () => {
    const formData = new FormData();
    formData.append("positionId", positionId);
    if (currentRevision) {
      formData.append("cloneFromId", currentRevision.id);
      formData.append("notes", `Cópia da versão ${currentRevision.version}`);
    }

    startTransition(async () => {
      const result = await createNewKitVersion(formData);
      if (result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Erro ao criar nova versão");
      } else {
        toast.success("Nova versão rascunho criada!");
        router.push(`/materiais/kits/${positionId}?revisionId=${result.id}`);
      }
    });
  };

  const handlePublish = async () => {
    if (!currentRevision) return;

    startTransition(async () => {
      const result = await publishKitVersion(currentRevision.id, positionId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Versão publicada com sucesso! Vigência iniciada.");
      }
    });
  };

  const currentKits = currentRevision?.items || [];
  const uniforms = currentKits.filter((k) => k.material.category === "UNIFORM");
  const ppes = currentKits.filter((k) => k.material.category === "PPE");

  return (
    <div className="space-y-6">
      {/* Revision History Rail */}
      <div className="flex flex-wrap items-center gap-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <History className="text-muted-foreground h-5 w-5" />
          <span className="text-sm font-semibold tracking-wider uppercase">
            Histórico de Versões
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {revisions.map((rev) => (
            <Button
              key={rev.id}
              variant={currentRevision?.id === rev.id ? "default" : "outline"}
              size="sm"
              onClick={() => {
                cancelEdit();
                router.push(`/materiais/kits/${positionId}?revisionId=${rev.id}`);
              }}
              className="h-9 min-w-16 transition-all"
            >
              v{rev.version}
              {rev.isActive && <CheckCircle className="ml-2 h-3.5 w-3.5 text-green-400" />}
              {!rev.isActive && !rev.validTo && (
                <AlertCircle className="ml-2 h-3.5 w-3.5 animate-pulse text-amber-500" />
              )}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateVersion}
            disabled={isPending}
            className="hover:border-primary hover:text-primary h-9 border-dashed"
          >
            <Copy className="mr-2 h-4 w-4" /> Nova Versão
          </Button>
        </div>
      </div>

      {!currentRevision ? (
        <Card className="flex flex-col items-center justify-center border-2 border-dashed p-12 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-amber-500" />
          <h3 className="text-xl font-bold">Nenhum Kit Configurado</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Este cargo ainda não possui nenhuma versão de kit definida. Comece criando a primeira
            versão para configurar os itens.
          </p>
          <Button onClick={handleCreateVersion} disabled={isPending} size="lg">
            Criar Primeira Versão
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Editor & Properties */}
          <div className="space-y-6 lg:col-span-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <span>Versão {currentRevision.version}</span>
                  <AnimatePresence mode="wait">
                    {currentRevision.isActive ? (
                      <motion.div
                        key="active"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Badge className="bg-green-600 px-3 py-1">ATIVA</Badge>
                      </motion.div>
                    ) : currentRevision.validTo ? (
                      <motion.div
                        key="history"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Badge variant="secondary" className="px-3 py-1">
                          HISTÓRICO
                        </Badge>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="draft"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Badge
                          variant="outline"
                          className="border-amber-600 bg-amber-50 px-3 py-1 text-amber-600"
                        >
                          RASCUNHO
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardTitle>
                <CardDescription>Configurações e observações desta revisão.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 flex flex-col gap-1.5 rounded-lg p-2">
                    <span className="text-muted-foreground text-[10px] font-bold tracking-tighter uppercase">
                      Início Vigência
                    </span>
                    <div className="flex items-center gap-2 font-medium">
                      <Calendar className="text-primary h-4 w-4" />
                      {new Date(currentRevision.validFrom).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="bg-muted/50 flex flex-col gap-1.5 rounded-lg p-2">
                    <span className="text-muted-foreground text-[10px] font-bold tracking-tighter uppercase">
                      Fim Vigência
                    </span>
                    <div className="flex items-center gap-2 font-medium">
                      <Calendar className="text-muted-foreground h-4 w-4" />
                      {currentRevision.validTo
                        ? new Date(currentRevision.validTo).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-sm font-semibold">Notas da Versão</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Descreva as mudanças ou motivo desta nova versão..."
                    className="bg-background min-h-[100px] resize-none"
                    disabled={!isDraft}
                  />
                  {isDraft && notes !== (currentRevision.notes || "") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 w-full"
                      onClick={handleSaveNotes}
                      disabled={isPending}
                    >
                      <Save className="mr-2 h-4 w-4" /> Salvar Notas
                    </Button>
                  )}
                </div>

                {isDraft && (
                  <Button
                    className="group w-full bg-green-700 shadow-md hover:bg-green-800"
                    onClick={handlePublish}
                    disabled={isPending}
                    size="lg"
                  >
                    <CheckCircle className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
                    Publicar Agora
                  </Button>
                )}

                {currentRevision.isActive && (
                  <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-900">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 shrink-0 text-blue-600" />
                      <span className="font-semibold">Versão em Produção</span>
                    </div>
                    <p className="leading-relaxed opacity-80">
                      Esta é a versão vigente para o cargo <strong>{positionName}</strong>.
                      Alterações diretas no histórico não são permitidas para garantir auditoria.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-blue-200 bg-white"
                      onClick={handleCreateVersion}
                    >
                      <Copy className="mr-2 h-4 w-4" /> Criar Cópia para Editar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card
              className={
                !isDraft
                  ? "pointer-events-none opacity-60 grayscale"
                  : "border-primary/20 bg-primary/5 shadow-md transition-all"
              }
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {editingItem ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  {editingItem ? "Editar Item" : "Adicionar Item"}
                </CardTitle>
                <CardDescription>
                  {isDraft
                    ? "Configure as especificidades do material no kit."
                    : "Crie um novo rascunho para habilitar o editor."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddItem} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-semibold">Material</Label>
                    <Select
                      value={selectedMaterial}
                      onValueChange={(val) => setSelectedMaterial(val || "")}
                      disabled={!!editingItem}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um material" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMaterials
                          .filter((m) => {
                            if (editingItem) return true;
                            const isAlreadyInKit = currentKits.some((k) => k.materialId === m.id);
                            if (isAlreadyInKit) return false;

                            // Check position requirements
                            if (m.category === "UNIFORM" && !requiresUniform) return false;
                            if (m.category === "PPE" && !requiresPPE) return false;

                            return true;
                          })
                          .map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {getMaterialVariantLabel(m)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-semibold">Quantidade</Label>
                      <Input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold">Obrigatório</Label>
                      <Select
                        value={mandatory}
                        onValueChange={(val) => setMandatory(val || "true")}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Sim</SelectItem>
                          <SelectItem value="false">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold">Periodicidade (Dias)</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 180 (vazio = troca única)"
                      value={periodDays}
                      onChange={(e) => setPeriodDays(e.target.value)}
                      className="bg-background"
                    />
                    <p className="text-muted-foreground text-[10px] italic">
                      Vida útil estimada para reposição automática.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="submit"
                      className="flex-1 font-bold shadow-sm"
                      disabled={isPending || !selectedMaterial}
                    >
                      {isPending
                        ? "Salvando..."
                        : editingItem
                          ? "Salvar Alterações"
                          : "Adicionar ao Kit"}
                    </Button>
                    {editingItem && (
                      <Button type="button" variant="outline" size="icon" onClick={cancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Tables */}
          <div className="space-y-6 lg:col-span-8">
            {/* Summary Overview */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1 rounded-xl border bg-white p-4 text-center shadow-sm">
                <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                  Total Itens
                </p>
                <p className="text-3xl font-black">{currentKits.length}</p>
              </div>
              <div className="space-y-1 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-center shadow-sm">
                <p className="text-[10px] font-bold tracking-widest text-blue-600 uppercase">
                  Fardamento
                </p>
                <p className="text-3xl font-black text-blue-700">{uniforms.length}</p>
              </div>
              <div className="space-y-1 rounded-xl border border-orange-100 bg-orange-50/50 p-4 text-center shadow-sm">
                <p className="text-[10px] font-bold tracking-widest text-orange-600 uppercase">
                  Equip. EPI
                </p>
                <p className="text-3xl font-black text-orange-700">{ppes.length}</p>
              </div>
            </div>

            <Card className="ring-border overflow-hidden border-none shadow-sm ring-1">
              <CardHeader className="rounded-none bg-blue-600 pb-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                      <ShoppingBag className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Fardamento e Uniformes</CardTitle>
                      <CardDescription className="font-medium text-blue-100">
                        Itens de vestuário e identificação profissional.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="border-white/40 bg-white/20 text-white">
                    {uniforms.length} itens
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[40%] pl-6 text-[11px] font-bold tracking-wider uppercase">
                        Material
                      </TableHead>
                      <TableHead className="text-center text-[11px] font-bold tracking-wider uppercase">
                        Qtd / Unid
                      </TableHead>
                      <TableHead className="text-center text-[11px] font-bold tracking-wider uppercase">
                        Repos. (Dias)
                      </TableHead>
                      <TableHead className="pr-6 text-right text-[11px] font-bold tracking-wider uppercase">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uniforms.length > 0 ? (
                      uniforms.map((item) => (
                        <TableRow
                          key={item.id}
                          className="group hover:bg-muted/20 transition-colors"
                        >
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-zinc-800">{item.material.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-xs">
                                  {getMaterialDetailLabel(item.material)}
                                </span>
                                {!item.mandatory && (
                                  <Badge
                                    variant="outline"
                                    className="h-4 border-dashed px-1 py-0 text-[9px] uppercase"
                                  >
                                    Opcional
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-mono font-medium">
                            {item.quantity}{" "}
                            <span className="text-muted-foreground">{item.material.unit}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.periodDays ? (
                              <div className="inline-flex items-center gap-1.5 rounded bg-zinc-100 px-2 py-1 text-[12px] font-medium">
                                <History className="h-3 w-3" />
                                {item.periodDays} dias
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-400 italic">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:text-primary h-8 w-8 text-zinc-500 transition-colors"
                                onClick={() => handleEditItem(item)}
                                disabled={isPending || !isDraft}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:text-destructive h-8 w-8 text-zinc-500 transition-colors"
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={isPending || !isDraft}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-muted-foreground py-10 text-center italic"
                        >
                          Nenhum fardamento cadastrado nesta versão.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="ring-border overflow-hidden border-none shadow-sm ring-1">
              <CardHeader className="rounded-none bg-orange-600 pb-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Equipamentos de Proteção (EPI)</CardTitle>
                      <CardDescription className="font-medium text-orange-100">
                        Materiais críticos para segurança laboral e auditoria legal.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="border-white/40 bg-white/20 text-white">
                    {ppes.length} itens
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[40%] pl-6 text-[11px] font-bold tracking-wider uppercase">
                        Material
                      </TableHead>
                      <TableHead className="text-center text-[11px] font-bold tracking-wider uppercase">
                        Qtd / Unid
                      </TableHead>
                      <TableHead className="text-center text-[11px] font-bold tracking-wider uppercase">
                        Repos. (Dias)
                      </TableHead>
                      <TableHead className="pr-6 text-right text-[11px] font-bold tracking-wider uppercase">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ppes.length > 0 ? (
                      ppes.map((item) => (
                        <TableRow
                          key={item.id}
                          className="group hover:bg-muted/20 transition-colors"
                        >
                          <TableCell className="pl-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-zinc-800">{item.material.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-xs">
                                  {getMaterialDetailLabel(item.material)}
                                </span>
                                {!item.mandatory && (
                                  <Badge
                                    variant="outline"
                                    className="h-4 border-dashed px-1 py-0 text-[10px] uppercase"
                                  >
                                    Opcional
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-mono font-medium">
                            {item.quantity}{" "}
                            <span className="text-muted-foreground">{item.material.unit}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.periodDays ? (
                              <div className="inline-flex items-center gap-1.5 rounded bg-zinc-100 px-2 py-1 text-[12px] font-medium">
                                <History className="h-3 w-3" />
                                {item.periodDays} dias
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-400 italic">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:text-primary h-8 w-8 text-zinc-500 transition-colors"
                                onClick={() => handleEditItem(item)}
                                disabled={isPending || !isDraft}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:text-destructive h-8 w-8 text-zinc-500 transition-colors"
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={isPending || !isDraft}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-muted-foreground py-10 text-center italic"
                        >
                          Nenhum EPI cadastrado nesta versão.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
