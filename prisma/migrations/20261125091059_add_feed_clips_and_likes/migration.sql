-- CreateTable
CREATE TABLE "FeedClip" (
    "id" UUID NOT NULL,
    "trackId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "clipAudioPath" TEXT NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedClip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedClipLike" (
    "id" UUID NOT NULL,
    "clipId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedClipLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeedClip_trackId_key" ON "FeedClip"("trackId");

-- CreateIndex
CREATE INDEX "FeedClip_userId_createdAt_idx" ON "FeedClip"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "FeedClip_createdAt_idx" ON "FeedClip"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "FeedClipLike_userId_createdAt_idx" ON "FeedClipLike"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "FeedClipLike_clipId_userId_key" ON "FeedClipLike"("clipId", "userId");

-- AddForeignKey
ALTER TABLE "FeedClip" ADD CONSTRAINT "FeedClip_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedClip" ADD CONSTRAINT "FeedClip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedClipLike" ADD CONSTRAINT "FeedClipLike_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "FeedClip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedClipLike" ADD CONSTRAINT "FeedClipLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
