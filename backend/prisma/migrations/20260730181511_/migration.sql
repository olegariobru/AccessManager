/*
  Warnings:

  - You are about to drop the column `cargo` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `grupo` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "cargo",
DROP COLUMN "grupo",
DROP COLUMN "role";

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");
