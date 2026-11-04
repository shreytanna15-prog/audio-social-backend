-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "coverPath" TEXT,
ADD COLUMN     "caption" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "playCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TrackPlay" (
    "id" UUID NOT NULL,
    "trackId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackPlay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Track_status_publishedAt_idx" ON "Track"("status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "TrackPlay_trackId_createdAt_idx" ON "TrackPlay"("trackId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "TrackPlay_userId_createdAt_idx" ON "TrackPlay"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "TrackPlay_trackId_userId_createdAt_idx" ON "TrackPlay"("trackId", "userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "TrackPlay" ADD CONSTRAINT "TrackPlay_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackPlay" ADD CONSTRAINT "TrackPlay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
