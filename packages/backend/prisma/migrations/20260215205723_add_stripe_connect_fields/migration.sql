-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PAYOUT_FAILED';
ALTER TYPE "NotificationType" ADD VALUE 'CONNECT_ONBOARDING_REQUIRED';

-- AlterTable
ALTER TABLE "payouts" ADD COLUMN     "failureReason" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stripeConnectAccountId" TEXT,
ADD COLUMN     "stripeConnectOnboarded" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeConnectAccountId_key" ON "users"("stripeConnectAccountId");
