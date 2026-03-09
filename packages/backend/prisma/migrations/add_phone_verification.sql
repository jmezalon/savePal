-- Add phone verification fields to users table
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "phoneVerificationToken" TEXT,
ADD COLUMN IF NOT EXISTS "phoneVerificationExpiry" TIMESTAMP(3);
