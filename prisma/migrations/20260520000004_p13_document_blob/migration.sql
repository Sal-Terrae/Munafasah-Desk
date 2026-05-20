-- P13: ClientDocument gains a blob handle. Three columns, all
-- nullable so existing rows (registered by filename only, no file)
-- stay valid.
ALTER TABLE "ClientDocument" ADD COLUMN "storageKey" TEXT;
ALTER TABLE "ClientDocument" ADD COLUMN "contentType" TEXT;
ALTER TABLE "ClientDocument" ADD COLUMN "sizeBytes" INTEGER;
