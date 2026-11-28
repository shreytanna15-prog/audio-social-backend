-- CreateEnum
CREATE TYPE "ContestPlacementMode" AS ENUM ('FIRST', 'TOP_THREE');

-- CreateEnum
CREATE TYPE "ContestPayoutMode" AS ENUM ('MANUAL', 'AUTO');

-- CreateTable
CREATE TABLE "Contest" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rules" TEXT NOT NULL,
    "genreIds" TEXT[],
    "prizeNote" TEXT NOT NULL,
    "placementMode" "ContestPlacementMode" NOT NULL,
    "payoutMode" "ContestPayoutMode" NOT NULL,
    "prizeCoinsFirst" INTEGER NOT NULL,
    "prizeCoinsSecond" INTEGER,
    "prizeCoinsThird" INTEGER,
    "announceAt" TIMESTAMP(3) NOT NULL,
    "submitStartAt" TIMESTAMP(3) NOT NULL,
    "submitEndAt" TIMESTAMP(3) NOT NULL,
    "voteEndAt" TIMESTAMP(3) NOT NULL,
    "resultsVisibleDays" INTEGER NOT NULL DEFAULT 15,
    "cancelledAt" TIMESTAMP(3),
    "winnersConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestEntry" (
    "id" UUID NOT NULL,
    "contestId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "trackId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestVote" (
    "id" UUID NOT NULL,
    "contestId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "entryId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContestEntry_trackId_idx" ON "ContestEntry"("trackId");

-- CreateIndex
CREATE INDEX "ContestEntry_contestId_createdAt_idx" ON "ContestEntry"("contestId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ContestEntry_contestId_userId_key" ON "ContestEntry"("contestId", "userId");

-- CreateIndex
CREATE INDEX "ContestVote_entryId_idx" ON "ContestVote"("entryId");

-- CreateIndex
CREATE INDEX "ContestVote_contestId_createdAt_idx" ON "ContestVote"("contestId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ContestVote_contestId_userId_key" ON "ContestVote"("contestId", "userId");

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestVote" ADD CONSTRAINT "ContestVote_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestVote" ADD CONSTRAINT "ContestVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestVote" ADD CONSTRAINT "ContestVote_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ContestEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
