-- P26: Per-org ingestion API keys. Replaces the single env-driven
-- INGESTION_API_KEY. keyHash is bcrypt(raw); keyPrefix is the first
-- 8 chars of raw (plaintext) — lookup short-circuits on prefix
-- before bcrypt'ing for verify.

CREATE TABLE "IngestionApiKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "IngestionApiKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IngestionApiKey_keyPrefix_key"
  ON "IngestionApiKey"("keyPrefix");
CREATE INDEX "IngestionApiKey_organizationId_idx"
  ON "IngestionApiKey"("organizationId");
CREATE INDEX "IngestionApiKey_revokedAt_idx"
  ON "IngestionApiKey"("revokedAt");

ALTER TABLE "IngestionApiKey"
  ADD CONSTRAINT "IngestionApiKey_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
