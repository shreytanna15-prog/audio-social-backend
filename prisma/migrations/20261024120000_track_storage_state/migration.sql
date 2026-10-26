-- CreateEnum
CREATE TYPE "TrackStorageState" AS ENUM ('LOCAL_ONLY', 'SYNCED', 'CLOUD_ONLY');

-- AlterTable Track
ALTER TABLE "Track" ADD COLUMN "storageState" "TrackStorageState" NOT NULL DEFAULT 'LOCAL_ONLY';
ALTER TABLE "Track" ALTER COLUMN "mixPath" DROP NOT NULL;

-- AlterTable TrackLayer
ALTER TABLE "TrackLayer" ALTER COLUMN "stemPath" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Track_userId_storageState_idx" ON "Track"("userId", "storageState");
