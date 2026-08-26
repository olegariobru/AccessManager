-- CreateEnum
CREATE TYPE "PasswordResetStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "password_reset_requests" (
    "id" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "PasswordResetStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "requesterIp" VARCHAR(100),
    "notificationSentAt" TIMESTAMP(3),

    CONSTRAINT "password_reset_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "password_reset_requests_userId_status_idx" ON "password_reset_requests"("userId", "status");

-- CreateIndex
CREATE INDEX "password_reset_requests_status_requestedAt_idx" ON "password_reset_requests"("status", "requestedAt");

-- AddForeignKey
ALTER TABLE "password_reset_requests" ADD CONSTRAINT "password_reset_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_requests" ADD CONSTRAINT "password_reset_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
