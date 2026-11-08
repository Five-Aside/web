-- AlterTable
ALTER TABLE "MatchEvent" ADD COLUMN "side" TEXT;

-- AlterTable
ALTER TABLE "MatchResult" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'final';
