/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,system_key]` on the table `share_businesses` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LedgerTransactionType" ADD VALUE 'member_purchase_release';
ALTER TYPE "LedgerTransactionType" ADD VALUE 'member_purchase_repayment';

-- AlterTable
ALTER TABLE "food_purchase_applications" ADD COLUMN     "approved_markup" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "goods_released_at" TIMESTAMPTZ(6),
ADD COLUMN     "goods_released_by_user_id" UUID;

-- AlterTable
ALTER TABLE "procurement_requests" ADD COLUMN     "approved_markup" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "share_businesses" ADD COLUMN     "system_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "share_businesses_tenant_system_key" ON "share_businesses"("tenant_id", "system_key");
