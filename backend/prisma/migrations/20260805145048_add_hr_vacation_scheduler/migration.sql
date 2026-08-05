-- AlterEnum
ALTER TYPE "RequestStatus" ADD VALUE 'PENDING_HR';

-- AlterTable
ALTER TABLE "vacation_requests" ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "scheduledById" INTEGER;

-- CreateIndex
CREATE INDEX "vacation_requests_scheduledById_idx" ON "vacation_requests"("scheduledById");

-- AddForeignKey
ALTER TABLE "vacation_requests" ADD CONSTRAINT "vacation_requests_scheduledById_fkey" FOREIGN KEY ("scheduledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
