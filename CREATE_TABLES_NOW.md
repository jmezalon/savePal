# Create Database Tables - Quick Steps

The connection URLs are having issues with Prisma. Let's create the tables directly in Supabase (takes 2 minutes).

## Step 1: Open SQL Editor

Click this link (it will open your Supabase SQL Editor):
👉 **https://supabase.com/dashboard/project/tsrmstkpcwmszmranzhw/sql/new**

## Step 2: Copy the SQL

Open the file: `packages/backend/create-tables.sql`

Or copy this SQL directly:

```sql
-- Create enum types
CREATE TYPE "Frequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');
CREATE TYPE "PayoutMethod" AS ENUM ('SEQUENTIAL', 'RANDOM', 'BIDDING');
CREATE TYPE "GroupStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "NotificationType" AS ENUM ('PAYMENT_DUE', 'PAYMENT_RECEIVED', 'PAYOUT_PENDING', 'PAYOUT_COMPLETED', 'GROUP_INVITE', 'GROUP_STARTED', 'GROUP_COMPLETED', 'PAYMENT_FAILED', 'REMINDER');

-- Users table
CREATE TABLE "users" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "email" TEXT UNIQUE NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Groups table
CREATE TABLE "groups" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contributionAmount" DOUBLE PRECISION NOT NULL,
    "frequency" "Frequency" NOT NULL,
    "payoutMethod" "PayoutMethod" NOT NULL,
    "status" "GroupStatus" NOT NULL DEFAULT 'PENDING',
    "maxMembers" INTEGER NOT NULL,
    "currentMembers" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "inviteCode" TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "groups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Memberships table
CREATE TABLE "memberships" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "payoutPosition" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "memberships_groupId_userId_key" UNIQUE ("groupId", "userId"),
    CONSTRAINT "memberships_groupId_payoutPosition_key" UNIQUE ("groupId", "payoutPosition"),
    CONSTRAINT "memberships_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Cycles table
CREATE TABLE "cycles" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "groupId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "recipientId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cycles_groupId_cycleNumber_key" UNIQUE ("groupId", "cycleNumber"),
    CONSTRAINT "cycles_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Payments table
CREATE TABLE "payments" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "cycleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentIntentId" TEXT UNIQUE,
    "stripeChargeId" TEXT,
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_cycleId_userId_key" UNIQUE ("cycleId", "userId"),
    CONSTRAINT "payments_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Payouts table
CREATE TABLE "payouts" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "cycleId" TEXT UNIQUE NOT NULL,
    "recipientId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "feeAmount" DOUBLE PRECISION NOT NULL,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripeTransferId" TEXT UNIQUE,
    "transferredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payouts_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payouts_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Payment Methods table
CREATE TABLE "payment_methods" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "stripePaymentMethodId" TEXT UNIQUE NOT NULL,
    "type" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "brand" TEXT,
    "expiryMonth" INTEGER,
    "expiryYear" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Notifications table
CREATE TABLE "notifications" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "groupId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notifications_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes
CREATE INDEX "memberships_userId_idx" ON "memberships"("userId");
CREATE INDEX "memberships_groupId_idx" ON "memberships"("groupId");
CREATE INDEX "payments_userId_idx" ON "payments"("userId");
CREATE INDEX "payments_cycleId_idx" ON "payments"("cycleId");
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");
```

## Step 3: Paste and Run

1. Paste the SQL into the Supabase SQL Editor
2. Click the **"Run"** button (or press Cmd+Enter / Ctrl+Enter)
3. Wait for "Success" message

## Step 4: Verify Tables Created

Click on **"Table Editor"** in the left sidebar.
You should now see 8 tables:
- ✅ users
- ✅ groups
- ✅ memberships
- ✅ cycles
- ✅ payments
- ✅ payouts
- ✅ payment_methods
- ✅ notifications

## Step 5: Test the API!

Once tables are created, come back and let me know - we'll test the auth endpoints!

Your backend server is already running at: http://localhost:3000
