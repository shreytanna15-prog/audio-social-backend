-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarPath" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "coverPath" TEXT,
ADD COLUMN     "usernameChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
