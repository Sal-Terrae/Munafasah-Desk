-- P22: Sector classifier — persist LLM-derived sector + category on Tender.

ALTER TABLE "Tender" ADD COLUMN "sector"             TEXT;
ALTER TABLE "Tender" ADD COLUMN "sectorCategory"     TEXT;
ALTER TABLE "Tender" ADD COLUMN "sectorConfidence"   DECIMAL(4,3);
ALTER TABLE "Tender" ADD COLUMN "sectorClassifiedAt" TIMESTAMP(3);
ALTER TABLE "Tender" ADD COLUMN "sectorInputHash"    TEXT;
ALTER TABLE "Tender" ADD COLUMN "sectorModel"        TEXT;

CREATE INDEX "Tender_sector_idx" ON "Tender"("sector");
