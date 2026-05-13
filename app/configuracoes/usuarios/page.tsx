import { UserManager } from "@/components/configuracoes/user-manager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth-server";
import prisma from "@/lib/prisma";

export default async function ConfigUsersPage() {
  const session = await requirePermission("MANAGE_USERS");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      profile: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const userItems = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    profileName: user.profile?.name ?? user.role,
    createdAtLabel: new Date(user.createdAt).toLocaleDateString("pt-BR"),
  }));

  return (
    <main className="mx-auto max-w-7xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Usuários do Sistema</h1>
        <p className="text-muted-foreground">Gerenciamento de contas e perfis de acesso.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listagem de Usuários</CardTitle>
          <CardDescription>
            Usuários não possuem permissões diretas; o acesso vem do perfil associado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserManager users={userItems} currentUserId={session.user.id} />
        </CardContent>
      </Card>
    </main>
  );
}
