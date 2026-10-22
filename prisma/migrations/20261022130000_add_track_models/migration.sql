-- CreateEnum
CREATE TYPE "TrackKind" AS ENUM ('SINGLE', 'MULTI');

-- CreateEnum
CREATE TYPE "TrackStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "Track" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" "TrackKind" NOT NULL,
    "status" "TrackStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "mixPath" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackLayer" (
    "id" UUID NOT NULL,
    "trackId" UUID NOT NULL,
    "sortIndex" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stemPath" TEXT NOT NULL,
    "sourcePath" TEXT,
    "offsetMs" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "appliedEffects" JSONB NOT NULL DEFAULT '[]',
    "peaks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackLayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Track_userId_createdAt_idx" ON "Track"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Track_userId_status_idx" ON "Track"("userId", "status");

-- CreateIndex
CREATE INDEX "TrackLayer_trackId_sortIndex_idx" ON "TrackLayer"("trackId", "sortIndex");

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackLayer" ADD CONSTRAINT "TrackLayer_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
