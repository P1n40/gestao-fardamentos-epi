-- RBAC profiles: users inherit permissions exclusively through the linked profile.
ALTER TABLE "User" ADD COLUMN "profileId" TEXT;

CREATE TABLE "AccessProfile" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "role" "UserRole" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccessProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfilePermission" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "route" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfilePermission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "AccessProfile_name_key" ON "AccessProfile"("name");
CREATE UNIQUE INDEX "AccessProfile_role_key" ON "AccessProfile"("role");
CREATE UNIQUE INDEX "ProfilePermission_profileId_code_key" ON "ProfilePermission"("profileId", "code");
CREATE INDEX "ProfilePermission_code_idx" ON "ProfilePermission"("code");
CREATE INDEX "ProfilePermission_route_action_idx" ON "ProfilePermission"("route", "action");
CREATE INDEX "User_profileId_idx" ON "User"("profileId");

ALTER TABLE "User"
  ADD CONSTRAINT "User_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "AccessProfile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProfilePermission"
  ADD CONSTRAINT "ProfilePermission_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "AccessProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
