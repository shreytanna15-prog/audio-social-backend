-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTrack" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "trackId" UUID NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectTrack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_userId_updatedAt_idx" ON "Project"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "ProjectTrack_projectId_addedAt_idx" ON "ProjectTrack"("projectId", "addedAt" DESC);

-- CreateIndex
CREATE INDEX "ProjectTrack_trackId_idx" ON "ProjectTrack"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTrack_projectId_trackId_key" ON "ProjectTrack"("projectId", "trackId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTrack" ADD CONSTRAINT "ProjectTrack_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTrack" ADD CONSTRAINT "ProjectTrack_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
