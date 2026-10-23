-- AlterTable
ALTER TABLE "User" ADD COLUMN "totpBackupCodes" TEXT;

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "day" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "PageView_day_idx" ON "PageView"("day");

-- CreateIndex
CREATE UNIQUE INDEX "PageView_day_path_key" ON "PageView"("day", "path");
