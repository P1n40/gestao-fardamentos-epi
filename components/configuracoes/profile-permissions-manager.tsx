"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Permission, PERMISSION_DEFINITIONS } from "@/lib/auth-utils";
import { updateProfilePermissions } from "@/modules/configuracoes/actions";

interface ProfileItem {
  id: string;
  name: string;
  permissions: string[];
}

export function ProfilePermissionsManager({ profiles }: { profiles: ProfileItem[] }) {
  const [drafts, setDrafts] = useState<Record<string, Permission[]>>(
    Object.fromEntries(
      profiles.map((profile) => [profile.id, profile.permissions as Permission[]]),
    ),
  );
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);

  function togglePermission(profileId: string, permission: Permission) {
    setDrafts((current) => {
      const profilePermissions = current[profileId] ?? [];
      const nextPermissions = profilePermissions.includes(permission)
        ? profilePermissions.filter((item) => item !== permission)
        : [...profilePermissions, permission];
      return { ...current, [profileId]: nextPermissions };
    });
  }

  async function saveProfile(profileId: string) {
    setPendingProfileId(profileId);
    try {
      const result = await updateProfilePermissions(profileId, drafts[profileId] ?? []);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Permissões do perfil atualizadas.");
    } finally {
      setPendingProfileId(null);
    }
  }

  return (
    <div className="space-y-8">
      {profiles.map((profile) => (
        <section key={profile.id} className="rounded-lg border p-4">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">{profile.name}</h2>
              <p className="text-muted-foreground text-sm">
                Usuários herdam permissões exclusivamente deste perfil.
              </p>
            </div>
            <Button
              onClick={() => saveProfile(profile.id)}
              disabled={pendingProfileId === profile.id}
            >
              {pendingProfileId === profile.id ? "Salvando..." : "Salvar permissões"}
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {PERMISSION_DEFINITIONS.map((permission) => (
              <label key={permission.code} className="flex items-start gap-3 rounded-md border p-3">
                <Checkbox
                  checked={(drafts[profile.id] ?? []).includes(permission.code)}
                  onCheckedChange={() => togglePermission(profile.id, permission.code)}
                />
                <span>
                  <span className="block text-sm font-medium">{permission.description}</span>
                  <span className="text-muted-foreground block text-xs">
                    {permission.route} · {permission.action}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
