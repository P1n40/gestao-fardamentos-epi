import { ProfilePermissionsManager } from "@/components/configuracoes/profile-permissions-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { ensureDefaultAccessProfiles } from "@/lib/rbac";

export default async function ProfilesPage() {
  await requirePermission("MANAGE_PROFILES");
  await ensureDefaultAccessProfiles();

  const profiles = await prisma.accessProfile.findMany({
    select: {
      id: true,
      name: true,
      permissions: {
        select: {
          code: true,
        },
        orderBy: { code: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto max-w-7xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Perfis & Permissões</h1>
        <p className="text-muted-foreground">
          Permissões são herdadas exclusivamente pelo perfil associado ao usuário.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matriz de permissões</CardTitle>
          <CardDescription>
            Todas as ações críticas continuam validadas no backend e auditadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfilePermissionsManager
            profiles={profiles.map((profile) => ({
              id: profile.id,
              name: profile.name,
              permissions: profile.permissions.map((permission) => permission.code),
            }))}
          />
        </CardContent>
      </Card>
    </main>
  );
}
