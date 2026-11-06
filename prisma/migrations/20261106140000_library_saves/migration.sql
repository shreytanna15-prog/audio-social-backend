-- AlterTable
ALTER TABLE "Playlist" ADD COLUMN "saveCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SavedTrack" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "trackId" UUID NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedPlaylist" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "playlistId" UUID NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedPlaylist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedAlbum" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "albumId" UUID NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedAlbum_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedTrack_userId_trackId_key" ON "SavedTrack"("userId", "trackId");

-- CreateIndex
CREATE INDEX "SavedTrack_userId_savedAt_idx" ON "SavedTrack"("userId", "savedAt" DESC);

-- CreateIndex
CREATE INDEX "SavedTrack_trackId_idx" ON "SavedTrack"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedPlaylist_userId_playlistId_key" ON "SavedPlaylist"("userId", "playlistId");

-- CreateIndex
CREATE INDEX "SavedPlaylist_userId_savedAt_idx" ON "SavedPlaylist"("userId", "savedAt" DESC);

-- CreateIndex
CREATE INDEX "SavedPlaylist_playlistId_idx" ON "SavedPlaylist"("playlistId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedAlbum_userId_albumId_key" ON "SavedAlbum"("userId", "albumId");

-- CreateIndex
CREATE INDEX "SavedAlbum_userId_savedAt_idx" ON "SavedAlbum"("userId", "savedAt" DESC);

-- CreateIndex
CREATE INDEX "SavedAlbum_albumId_idx" ON "SavedAlbum"("albumId");

-- AddForeignKey
ALTER TABLE "SavedTrack" ADD CONSTRAINT "SavedTrack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedTrack" ADD CONSTRAINT "SavedTrack_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPlaylist" ADD CONSTRAINT "SavedPlaylist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPlaylist" ADD CONSTRAINT "SavedPlaylist_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedAlbum" ADD CONSTRAINT "SavedAlbum_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedAlbum" ADD CONSTRAINT "SavedAlbum_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
