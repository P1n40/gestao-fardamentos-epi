-- Create reusable kit templates that can be copied into position kit revisions.
ALTER TABLE "KitRevision" ADD COLUMN "sourceTemplateId" TEXT;

CREATE TABLE "KitTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KitTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "periodDays" INTEGER,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitTemplateItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KitTemplatePositionLink" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "lastRevisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitTemplatePositionLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KitTemplate_name_key" ON "KitTemplate"("name");
CREATE UNIQUE INDEX "KitTemplateItem_templateId_materialId_key" ON "KitTemplateItem"("templateId", "materialId");
CREATE UNIQUE INDEX "KitTemplatePositionLink_templateId_positionId_key" ON "KitTemplatePositionLink"("templateId", "positionId");

CREATE INDEX "KitRevision_sourceTemplateId_idx" ON "KitRevision"("sourceTemplateId");
CREATE INDEX "KitTemplateItem_templateId_idx" ON "KitTemplateItem"("templateId");
CREATE INDEX "KitTemplateItem_materialId_idx" ON "KitTemplateItem"("materialId");
CREATE INDEX "KitTemplatePositionLink_positionId_idx" ON "KitTemplatePositionLink"("positionId");
CREATE INDEX "KitTemplatePositionLink_lastRevisionId_idx" ON "KitTemplatePositionLink"("lastRevisionId");

ALTER TABLE "KitRevision"
ADD CONSTRAINT "KitRevision_sourceTemplateId_fkey"
FOREIGN KEY ("sourceTemplateId") REFERENCES "KitTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "KitTemplateItem"
ADD CONSTRAINT "KitTemplateItem_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "KitTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KitTemplateItem"
ADD CONSTRAINT "KitTemplateItem_materialId_fkey"
FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "KitTemplatePositionLink"
ADD CONSTRAINT "KitTemplatePositionLink_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "KitTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KitTemplatePositionLink"
ADD CONSTRAINT "KitTemplatePositionLink_positionId_fkey"
FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "KitTemplatePositionLink"
ADD CONSTRAINT "KitTemplatePositionLink_lastRevisionId_fkey"
FOREIGN KEY ("lastRevisionId") REFERENCES "KitRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
