"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { resetEmployeeBase, resetStockBase } from "@/modules/configuracoes/actions";

type MaintenanceAction = "employees" | "stock";

export function MaintenanceActions() {
  const [pending, setPending] = useState<MaintenanceAction | null>(null);

  async function submitAction(action: MaintenanceAction, formData: FormData) {
    setPending(action);
    try {
      const result =
        action === "employees" ? await resetEmployeeBase(formData) : await resetStockBase(formData);
      if (result.error) {
        toast.error(
          typeof result.error === "string" ? result.error : "Verifique os campos informados.",
        );
        return;
      }
      toast.success("Ação administrativa executada e auditada.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <CriticalActionCard
        title="Zerar base de funcionários"
        description="Inativa todos os colaboradores ativos, preservando histórico operacional e jurídico."
        pending={pending === "employees"}
        onSubmit={(formData) => submitAction("employees", formData)}
      />
      <CriticalActionCard
        title="Zerar base de estoque"
        description="Zera saldos atuais sem excluir o histórico de movimentações."
        pending={pending === "stock"}
        onSubmit={(formData) => submitAction("stock", formData)}
      />
    </div>
  );
}

function CriticalActionCard({
  title,
  description,
  pending,
  onSubmit,
}: {
  title: string;
  description: string;
  pending: boolean;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Motivo obrigatório</Label>
            <Textarea
              name="reason"
              required
              minLength={10}
              placeholder="Descreva o motivo operacional."
            />
          </div>
          <div className="space-y-2">
            <Label>Confirmação explícita</Label>
            <Input name="confirmation" required placeholder="Digite CONFIRMAR" />
          </div>
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? "Executando..." : title}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
