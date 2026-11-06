-- AlterTable
ALTER TABLE "Track" ADD COLUMN "likeCount" INTEGER NOT NULL DEFAULT 0;

-- RenameTable
ALTER TABLE "SavedTrack" RENAME TO "LikedTrack";

-- RenameColumn
ALTER TABLE "LikedTrack" RENAME COLUMN "savedAt" TO "likedAt";

-- RenamePrimaryKey
ALTER TABLE "LikedTrack" RENAME CONSTRAINT "SavedTrack_pkey" TO "LikedTrack_pkey";

-- RenameForeignKey
ALTER TABLE "LikedTrack" RENAME CONSTRAINT "SavedTrack_userId_fkey" TO "LikedTrack_userId_fkey";

-- RenameForeignKey
ALTER TABLE "LikedTrack" RENAME CONSTRAINT "SavedTrack_trackId_fkey" TO "LikedTrack_trackId_fkey";

-- RenameIndex
ALTER INDEX "SavedTrack_userId_trackId_key" RENAME TO "LikedTrack_userId_trackId_key";

-- RenameIndex
ALTER INDEX "SavedTrack_userId_savedAt_idx" RENAME TO "LikedTrack_userId_likedAt_idx";

-- RenameIndex
ALTER INDEX "SavedTrack_trackId_idx" RENAME TO "LikedTrack_trackId_idx";
