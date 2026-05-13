"use client";

import { UserRole } from "@prisma/client";
import { Loader2, Pencil, Plus, Power, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getActionErrorMessage } from "@/lib/action-errors";
import { createUser, deleteUser, toggleUserStatus, updateUser } from "@/modules/usuarios/actions";

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  active: boolean;
  profileName: string;
  createdAtLabel: string;
}

interface UserManagerProps {
  users: UserItem[];
  currentUserId: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  RH_ALMOXARIFADO: "RH / Almoxarifado",
  GESTOR: "Gestor",
  OPERADOR: "Operador",
};

const ROLE_OPTIONS: UserRole[] = ["ADMIN", "RH_ALMOXARIFADO", "GESTOR", "OPERADOR"];

export function UserManager({ users, currentUserId }: UserManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  function openCreateDialog() {
    setEditingUser(null);
    setFeedback(null);
    setOpen(true);
  }

  function openEditDialog(user: UserItem) {
    setEditingUser(user);
    setFeedback(null);
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    const formData = new FormData(event.currentTarget);

    try {
      const result = editingUser
        ? await updateUser(editingUser.id, formData)
        : await createUser(formData);

      if (result.error) {
        const message = getActionErrorMessage(result.error, "Nao foi possivel salvar o usuario.");
        setFeedback(message);
        toast.error(message);
        return;
      }

      toast.success(editingUser ? "Usuario atualizado." : "Usuario criado.");
      setOpen(false);
      router.refresh();
    } catch {
      const message = "Erro inesperado ao salvar usuario.";
      setFeedback(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleStatus(user: UserItem) {
    setPendingUserId(user.id);

    try {
      const result = await toggleUserStatus(user.id);

      if (result.error) {
        toast.error(getActionErrorMessage(result.error, "Nao foi possivel alterar o status."));
        return;
      }

      toast.success(user.active ? "Usuario desativado." : "Usuario ativado.");
      router.refresh();
    } catch {
      toast.error("Erro inesperado ao alterar o status.");
    } finally {
      setPendingUserId(null);
    }
  }

  async function handleDelete(user: UserItem) {
    const confirmed = window.confirm(
      `Excluir o usuario ${user.name || user.email}? Esta acao so sera concluida se nao houver vinculos no historico.`,
    );

    if (!confirmed) {
      return;
    }

    setPendingUserId(user.id);

    try {
      const result = await deleteUser(user.id);

      if (result.error) {
        toast.error(getActionErrorMessage(result.error, "Nao foi possivel excluir o usuario."));
        return;
      }

      toast.success("Usuario excluido.");
      router.refresh();
    } catch {
      toast.error("Erro inesperado ao excluir usuario.");
    } finally {
      setPendingUserId(null);
    }
  }

  const formKey = editingUser?.id ?? "new-user";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Novo usuario
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isCurrentUser = user.id === currentUserId;
              const isPending = pendingUserId === user.id;

              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name || "N/A"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                      {user.profileName}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.active ? "outline" : "destructive"}
                      className={user.active ? "border-green-600 text-green-600" : ""}
                    >
                      {user.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {user.createdAtLabel}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEditDialog(user)}
                        title="Editar usuario"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleToggleStatus(user)}
                        disabled={isCurrentUser || isPending}
                        title={user.active ? "Desativar usuario" : "Ativar usuario"}
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => handleDelete(user)}
                        disabled={isCurrentUser || isPending}
                        title="Excluir usuario"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
          <form key={formKey} onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Editar usuario" : "Novo usuario"}</DialogTitle>
              <DialogDescription>
                Defina os dados da conta e o perfil de acesso por papel.
              </DialogDescription>
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

            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingUser?.name ?? ""}
                  placeholder="Nome completo"
                  required
                />
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingUser?.email ?? ""}
                  placeholder="usuario@empresa.com"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">Perfil</Label>
                <Select name="role" defaultValue={editingUser?.role ?? "OPERADOR"}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="active">Status</Label>
                <Select
                  name="active"
                  defaultValue={editingUser?.active === false ? "false" : "true"}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="password">
                  {editingUser ? "Nova senha opcional" : "Senha inicial"}
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder={editingUser ? "Deixe em branco para manter a senha atual" : ""}
                  required={!editingUser}
                  minLength={8}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
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
    </div>
  );
}
