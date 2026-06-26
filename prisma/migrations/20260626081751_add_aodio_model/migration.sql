-- CreateEnum
CREATE TYPE "AudioStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "Audio" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "AudioStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "playbackPath" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "appliedEffects" JSONB NOT NULL DEFAULT '[]',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Audio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Audio_userId_createdAt_idx" ON "Audio"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Audio_userId_status_idx" ON "Audio"("userId", "status");

-- AddForeignKey
ALTER TABLE "Audio" ADD CONSTRAINT "Audio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
