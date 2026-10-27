-- AlterEnum
ALTER TYPE "SearchRecentKind" ADD VALUE 'SONG';
ALTER TYPE "SearchRecentKind" ADD VALUE 'ALBUM';
ALTER TYPE "SearchRecentKind" ADD VALUE 'PLAYLIST';

-- DropForeignKey
ALTER TABLE "SearchRecent" DROP CONSTRAINT "SearchRecent_targetUserId_fkey";

-- DropIndex
DROP INDEX "SearchRecent_userId_kind_targetUserId_key";

-- AlterTable
ALTER TABLE "SearchRecent" ADD COLUMN "targetKey" TEXT;
ALTER TABLE "SearchRecent" ADD COLUMN "title" TEXT;
ALTER TABLE "SearchRecent" ADD COLUMN "subtitle" TEXT;
ALTER TABLE "SearchRecent" ADD COLUMN "coverUrl" TEXT;

-- Backfill targetKey from existing artist rows
UPDATE "SearchRecent" SET "targetKey" = "targetUserId"::text WHERE "targetKey" IS NULL;

ALTER TABLE "SearchRecent" ALTER COLUMN "targetKey" SET NOT NULL;
ALTER TABLE "SearchRecent" ALTER COLUMN "targetUserId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SearchRecent_userId_kind_targetKey_key" ON "SearchRecent"("userId", "kind", "targetKey");

-- AddForeignKey
ALTER TABLE "SearchRecent" ADD CONSTRAINT "SearchRecent_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
