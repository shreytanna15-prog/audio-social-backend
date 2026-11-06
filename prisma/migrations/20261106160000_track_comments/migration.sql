-- AlterTable
ALTER TABLE "Track" ADD COLUMN "commentCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TrackComment" (
    "id" UUID NOT NULL,
    "trackId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "parentId" UUID,
    "body" TEXT NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackCommentLike" (
    "id" UUID NOT NULL,
    "commentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackCommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrackComment_trackId_createdAt_idx" ON "TrackComment"("trackId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "TrackComment_trackId_likeCount_createdAt_idx" ON "TrackComment"("trackId", "likeCount" DESC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "TrackComment_parentId_createdAt_idx" ON "TrackComment"("parentId", "createdAt" ASC);

-- CreateIndex
CREATE INDEX "TrackComment_userId_createdAt_idx" ON "TrackComment"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "TrackCommentLike_userId_commentId_key" ON "TrackCommentLike"("userId", "commentId");

-- CreateIndex
CREATE INDEX "TrackCommentLike_commentId_idx" ON "TrackCommentLike"("commentId");

-- AddForeignKey
ALTER TABLE "TrackComment" ADD CONSTRAINT "TrackComment_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackComment" ADD CONSTRAINT "TrackComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackComment" ADD CONSTRAINT "TrackComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TrackComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackCommentLike" ADD CONSTRAINT "TrackCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "TrackComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackCommentLike" ADD CONSTRAINT "TrackCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
