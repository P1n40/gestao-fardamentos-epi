/* eslint-disable */
"use client";

import {
  Plus,
  Trash2,
  Search,
  Sparkles,
  Loader2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { OperationFeedback } from "@/components/shared/operation-feedback";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { registerDelivery, fetchKitForEmployee } from "@/modules/entregas/actions";

interface Employee {
  id: string;
  name: string;
  documentId: string;
  active: boolean;
  position: {
    name: string;
  };
}

interface Material {
  id: string;
  name: string;
  category: "UNIFORM" | "PPE";
  size: string | null;
  stock: number;
  caNumber: string | null;
}

interface DeliveryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  materials: Material[];
}

interface SelectedItem {
  id: string; // Internal temporary ID for the list
  materialId: string;
  quantity: number;
  isReplacement: boolean;
  caNumber: string;
  stockAvailable?: number;
}

type Step = "EDITING" | "REVIEW";

export function DeliveryFormDialog({
  open,
  onOpenChange,
  employees,
  materials,
}: DeliveryFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("EDITING");
  const [isLoadingKit, setIsLoadingKit] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState<"UNIFORM" | "PPE">("UNIFORM");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredEmployees = employees.filter(
    (e) =>
      e.active &&
      (e.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        e.documentId.includes(employeeSearch)),
  );

  const selectedEmployee = employees.find((e) => e.id === employeeId);

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setEmployeeId("");
      setEmployeeSearch("");
      setType("UNIFORM");
      setNotes("");
      setItems([]);
      setStep("EDITING");
      setFeedback(null);
    }
    onOpenChange(val);
  };

  const loadKitSuggestion = async () => {
    if (!employeeId) {
      const message = "Selecione um colaborador antes de buscar o kit.";
      setFeedback(message);
      return toast.error(message);
    }

    setIsLoadingKit(true);
    setFeedback(null);
    try {
      const result = await fetchKitForEmployee(employeeId, type);
      if ("error" in result) {
        const message = result.error ?? "Erro ao carregar kit.";
        setFeedback(message);
        toast.error(message);
      } else if (!result.items || result.items.length === 0) {
        const message = "Nenhum kit configurado para este cargo nesta categoria.";
        setFeedback(message);
        toast.info(message);
      } else {
        const newItems: SelectedItem[] = result.items.map(
          (item: any) => ({
            id: Math.random().toString(36).substring(2, 11),
            materialId: item.materialId,
            quantity: item.quantity,
            isReplacement: false,
            caNumber: item.caNumber || "",
          }),
        );
        setItems(newItems);
        setFeedback(null);
        toast.success(`${newItems.length} itens sugeridos conforme kit do cargo.`);
      }
    } catch {
      const message = "Erro ao carregar kit.";
      setFeedback(message);
      toast.error(message);
    } finally {
      setIsLoadingKit(false);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).substring(2, 11),
        materialId: "",
        quantity: 1,
        isReplacement: false,
        caNumber: "",
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof SelectedItem, value: any) => {
    setItems((prevItems) =>
      prevItems.map((i) => {
        if (i.id === id) {
          if (field === "materialId") {
            const material = materials.find((m) => m.id === value);
            return {
              ...i,
              [field]: value,
              caNumber: material?.caNumber || "",
              stockAvailable: material?.stock ?? 0,
            };
          }
          return { ...i, [field]: value };
        }
        return i;
      }),
    );
  };

  const hasStockErrors = items.some((item) => {
    if (!item.materialId) return false;
    const material = materials.find((m) => m.id === item.materialId);
    return material && item.quantity > material.stock;
  });

  const goToReview = () => {
    if (!employeeId) {
      const message = "Selecione um colaborador.";
      setFeedback(message);
      return toast.error(message);
    }
    if (items.length === 0) {
      const message = "Adicione pelo menos um item antes de revisar.";
      setFeedback(message);
      return toast.error(message);
    }
    if (items.some((i) => !i.materialId)) {
      const message = "Selecione os materiais de todos os itens.";
      setFeedback(message);
      return toast.error(message);
    }
    if (hasStockErrors) {
      const message = "Corrija os itens com estoque insuficiente antes de continuar.";
      setFeedback(message);
      return toast.error(message);
    }

    setFeedback(null);
    setStep("REVIEW");
  };

  const handleConfirm = async () => {
    const payload = {
      employeeId,
      type,
      notes,
      items: items.map((i) => ({
        materialId: i.materialId,
        quantity: i.quantity,
        isReplacement: i.isReplacement,
        caNumber: i.caNumber,
      })),
    };

    startTransition(async () => {
      const result = await registerDelivery(payload);
      if (result.error) {
        const message = typeof result.error === "string" ? result.error : "Erro ao registrar entrega";
        setFeedback(message);
        toast.error(message);
      } else {
        setFeedback(null);
        toast.success("Entrega registrada com sucesso! Transação atômica concluída.");
        handleOpenChange(false);
      }
    });
  };

  const availableMaterials = materials.filter((m) => m.category === type);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Logo da Empresa"
              width={60}
              height={30}
            />
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                type === "UNIFORM" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600",
              )}
            >
              {type === "UNIFORM" ? (
                <Plus className="h-6 w-6" />
              ) : (
                <AlertTriangle className="h-6 w-6" />
              )}
            </div>
            <div>
              <DialogTitle>
                {step === "EDITING" ? "Registrar Entrega" : "Confirmar Entrega"}
              </DialogTitle>
              <DialogDescription>
                {step === "EDITING"
                  ? "Preencha os dados da entrega abaixo."
                  : "Revise os dados antes da baixa definitiva no estoque."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === "EDITING" ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-6 overflow-y-auto p-6 pt-2">
              {feedback && (
                <OperationFeedback
                  title="Atencao operacional"
                  message={feedback}
                  variant={feedback.includes("Nenhum kit") ? "warning" : "error"}
                />
              )}
              {(isPending || isLoadingKit) && (
                <OperationFeedback
                  title={isLoadingKit ? "Carregando kit" : "Processando entrega"}
                  message={
                    isLoadingKit
                      ? "Consultando configuracao do cargo e sugerindo itens para a categoria."
                      : "Validando dados, baixando estoque e registrando a documentacao operacional."
                  }
                  variant="loading"
                />
              )}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    Colaborador
                  </Label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                      <Input
                        placeholder="Pesquisar..."
                        className="h-9 pl-8 text-sm"
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                      />
                    </div>
                    <Select value={employeeId} onValueChange={(val) => setEmployeeId(val || "")}>
                      <SelectTrigger className="h-9 border-zinc-200 bg-white">
                        <SelectValue placeholder="Selecione o colaborador" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredEmployees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            <span className="font-medium">{e.name}</span>
                            <span className="text-muted-foreground ml-2 text-[10px] opacity-70">
                              {e.documentId} • {e.position.name}
                            </span>
                          </SelectItem>
                        ))}
                        {filteredEmployees.length === 0 && (
                          <div className="text-muted-foreground p-2 text-center text-xs">
                            Nenhum ativo encontrado
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                    Categoria
                  </Label>
                  <div className="space-y-2">
                    <Select
                      value={type}
                      onValueChange={(v) => {
                        if (v) {
                          setType(v as "UNIFORM" | "PPE");
                          setItems([]);
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 border-zinc-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNIFORM">👕 Fardamento / Uniforme</SelectItem>
                        <SelectItem value="PPE">🛡️ Equipamento de Proteção (EPI)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 h-9 w-full gap-2"
                      onClick={loadKitSuggestion}
                      disabled={!employeeId || isLoadingKit}
                    >
                      {isLoadingKit ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Carregar Itens do Kit
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                  <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
                    Itens da Entrega
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addItem}
                    className="text-primary hover:bg-primary/5 h-8 gap-1"
                  >
                    <Plus className="h-4 w-4" /> Adicionar Manual
                  </Button>
                </div>

                {items.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-100 py-12 text-center">
                    <div className="mb-2 rounded-full bg-zinc-50 p-3">
                      <Plus className="h-6 w-6 text-zinc-300" />
                    </div>
                    <p className="text-sm font-medium text-zinc-400">Nenhum item na lista.</p>
                    <p className="text-[10px] text-zinc-400">
                      Use o botão acima ou carregue o kit do colaborador.
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {items.map((item) => {
                    const selectedMaterial = materials.find((m) => m.id === item.materialId);
                    const isStockInsufficient =
                      selectedMaterial && item.quantity > selectedMaterial.stock;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "group relative grid grid-cols-12 items-end gap-3 rounded-xl border p-3 transition-all",
                          isStockInsufficient
                            ? "border-destructive/30 bg-destructive/5"
                            : "border-zinc-100 bg-white hover:border-zinc-200",
                        )}
                      >
                        <div className="col-span-4 space-y-1.5">
                          <Label className="text-[10px] font-bold text-zinc-400 uppercase">
                            Material
                          </Label>
                          <Select
                            value={item.materialId}
                            onValueChange={(v) => updateItem(item.id, "materialId", v)}
                          >
                            <SelectTrigger className="h-9 border-zinc-100 bg-zinc-50/50">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableMaterials.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.name} {m.size ? `(${m.size})` : ""} — Saldo: {m.stock}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-bold text-zinc-400 uppercase">
                              Qtd
                            </Label>
                          </div>
                          <Input
                            type="number"
                            min="1"
                            className={cn(
                              "h-9 border-zinc-100 bg-zinc-50/50",
                              isStockInsufficient && "border-destructive",
                            )}
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(item.id, "quantity", parseInt(e.target.value) || 1)
                            }
                          />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-[10px] font-bold text-zinc-400 uppercase">
                            C.A.
                          </Label>
                          <Input
                            className="h-9 border-zinc-100 bg-zinc-50/50 font-mono text-xs uppercase"
                            placeholder="CA"
                            value={item.caNumber}
                            onChange={(e) => updateItem(item.id, "caNumber", e.target.value)}
                          />
                        </div>
                        <div className="col-span-3 pb-1">
                          <label className="flex cursor-pointer items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase">
                            <input
                              type="checkbox"
                              className="checked:bg-primary h-3.5 w-3.5 rounded border-zinc-300 transition-all"
                              checked={item.isReplacement}
                              onChange={(e) =>
                                updateItem(item.id, "isReplacement", e.target.checked)
                              }
                            />
                            Substituição
                          </label>
                          {isStockInsufficient && (
                            <div className="text-destructive mt-1 flex items-center gap-1 text-[9px] font-bold uppercase">
                              <AlertTriangle className="h-3 w-3" /> Sem saldo (
                              {selectedMaterial?.stock})
                            </div>
                          )}
                        </div>
                        <div className="col-span-1 flex justify-end pb-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="hover:text-destructive h-8 w-8 text-zinc-300"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  Observações
                </Label>
                <Textarea
                  placeholder="Justificativa ou notas adicionais..."
                  className="min-h-[60px] resize-none border-zinc-200 bg-zinc-50/30 text-sm italic"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="border-t bg-zinc-50/50 p-4">
              <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button onClick={goToReview} className="gap-2" disabled={items.length === 0}>
                Revisar Entrega <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-6 overflow-y-auto p-6 pt-2">
              {feedback && (
                <OperationFeedback
                  title="Pendencia antes da confirmacao"
                  message={feedback}
                  variant="error"
                />
              )}
              {isPending && (
                <OperationFeedback
                  title="Efetivando entrega"
                  message="Atualizando estoque, vinculos e documento operacional do colaborador."
                  variant="loading"
                />
              )}
              <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4">
                <h4 className="mb-3 text-[10px] font-bold tracking-widest text-blue-500 uppercase">
                  Dados do Destinatário
                </h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-zinc-900">{selectedEmployee?.name}</p>
                    <p className="text-xs text-zinc-500">
                      {selectedEmployee?.documentId} • {selectedEmployee?.position.name}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-white px-3 py-1 text-[10px] font-bold tracking-tight"
                  >
                    {type === "UNIFORM" ? "CORPO UNIFORME" : "PROTEÇÃO EPI"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
                  Resumo da Movimentação
                </h4>
                <div className="overflow-hidden rounded-xl border border-zinc-100">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase">
                      <tr>
                        <th className="px-4 py-2">Material</th>
                        <th className="px-4 py-2 text-center">Qtd</th>
                        <th className="px-4 py-2 text-center">Tipo</th>
                        <th className="px-4 py-2">C.A.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {items.map((item) => {
                        const material = materials.find((m) => m.id === item.materialId);
                        return (
                          <tr key={item.id} className="text-zinc-600">
                            <td className="px-4 py-3 font-medium">{material?.name}</td>
                            <td className="px-4 py-3 text-center font-mono">{item.quantity}</td>
                            <td className="px-4 py-3 text-center">
                              {item.isReplacement ? (
                                <Badge className="border-orange-100 bg-orange-50 text-[9px] text-orange-600">
                                  Subst.
                                </Badge>
                              ) : (
                                <Badge className="border-green-100 bg-green-50 text-[9px] text-green-600">
                                  Novo
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs uppercase">
                              {item.caNumber || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {notes && (
                <div className="rounded-lg border border-zinc-100 bg-zinc-50/30 p-3 text-xs text-zinc-500 italic">
                  &quot;{notes}&quot;
                </div>
              )}

              <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-4 text-xs text-amber-800">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p>
                  <strong>Atenção:</strong> Esta operação é irreversível e atualizará
                  automaticamente o saldo em estoque dos itens listados acima.
                </p>
              </div>
            </div>

            <DialogFooter className="border-t bg-zinc-50/50 p-4">
              <Button variant="ghost" onClick={() => setStep("EDITING")} disabled={isPending}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
              <Button
                onClick={handleConfirm}
                className="gap-2 bg-zinc-900 shadow-xl hover:bg-black"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Processando Transação...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Confirmar e Efetivar Baixa
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
