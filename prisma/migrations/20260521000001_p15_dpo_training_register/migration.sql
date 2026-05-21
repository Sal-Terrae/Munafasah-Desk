-- P15: DPO training register. Captures PDPL-training evidence per
-- staff member, with optional expiry tracking. Subject identity is
-- snapshotted (subjectName + subjectEmail) so the row survives a
-- platform User row erasure — required for PDPL §10 audit.

-- CreateTable
CREATE TABLE "DpoTrainingRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "subjectName" TEXT NOT NULL,
    "subjectEmail" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "provider" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "evidenceRef" TEXT,
    "evidenceDocumentId" TEXT,
    "notes" TEXT,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DpoTrainingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DpoTrainingRecord_organizationId_idx" ON "DpoTrainingRecord"("organizationId");
CREATE INDEX "DpoTrainingRecord_organizationId_validUntil_idx" ON "DpoTrainingRecord"("organizationId", "validUntil");
CREATE INDEX "DpoTrainingRecord_organizationId_subjectEmail_idx" ON "DpoTrainingRecord"("organizationId", "subjectEmail");

-- AddForeignKey
ALTER TABLE "DpoTrainingRecord" ADD CONSTRAINT "DpoTrainingRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
