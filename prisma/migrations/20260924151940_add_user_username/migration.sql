-- AlterTable
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Backfill existing users with unique placeholder usernames
UPDATE "User"
SET "username" = 'user_' || REPLACE(LEFT("id"::text, 8), '-', '')
WHERE "username" IS NULL;

-- Ensure uniqueness if collision (append more of id)
UPDATE "User" u
SET "username" = 'user_' || REPLACE("id"::text, '-', '')
WHERE "username" IN (
  SELECT "username" FROM "User"
  GROUP BY "username"
  HAVING COUNT(*) > 1
);

-- Make required + unique
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
