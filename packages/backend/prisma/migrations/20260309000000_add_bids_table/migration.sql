-- CreateEnum
CREATE TYPE "BiddingStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable: Add biddingStatus to cycles
ALTER TABLE "cycles" ADD COLUMN "biddingStatus" "BiddingStatus";

-- AlterTable: Add debt tracking and auto-payment fields to memberships
ALTER TABLE "memberships" ADD COLUMN "outstandingDebt" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "memberships" ADD COLUMN "debtPaymentIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "memberships" ADD COLUMN "autoPaymentConsented" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "memberships" ADD COLUMN "autoPaymentConsentedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "bids" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bids_cycleId_userId_key" ON "bids"("cycleId", "userId");

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
