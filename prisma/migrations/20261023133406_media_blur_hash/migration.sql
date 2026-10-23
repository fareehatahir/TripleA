-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN "blur" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN "hash" TEXT;

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN "blur" TEXT;
ALTER TABLE "ProductImage" ADD COLUMN "mediaId" TEXT;

-- CreateIndex
CREATE INDEX "MediaAsset_hash_idx" ON "MediaAsset"("hash");

-- CreateIndex
CREATE INDEX "ProductImage_mediaId_idx" ON "ProductImage"("mediaId");
