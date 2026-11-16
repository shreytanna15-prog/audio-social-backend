-- AlterTable
ALTER TABLE "User" ADD COLUMN "preferredGenres" TEXT[] DEFAULT ARRAY[]::TEXT[];
