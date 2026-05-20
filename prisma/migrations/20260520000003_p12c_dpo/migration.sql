-- P12c: DPO contact registry. One row per organization.

-- CreateTable
CREATE TABLE "DpoContact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "authorityEmail" TEXT NOT NULL,
    "retentionPolicyDays" INTEGER NOT NULL DEFAULT 2555,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DpoContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DpoContact_organizationId_key" ON "DpoContact"("organizationId");

-- AddForeignKey
ALTER TABLE "DpoContact" ADD CONSTRAINT "DpoContact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
