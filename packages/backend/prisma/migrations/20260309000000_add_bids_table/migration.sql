-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "BiddingStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: Add biddingStatus to cycles
ALTER TABLE "cycles" ADD COLUMN IF NOT EXISTS "biddingStatus" "BiddingStatus";

-- AlterTable: Add debt tracking and auto-payment fields to memberships
ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "outstandingDebt" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "debtPaymentIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "autoPaymentConsented" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "autoPaymentConsentedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bids" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bids_cycleId_userId_key" ON "bids"("cycleId", "userId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "bids" ADD CONSTRAINT "bids_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "bids" ADD CONSTRAINT "bids_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
