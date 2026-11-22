-- CreateEnum
CREATE TYPE "PaymentAllocationMode" AS ENUM ('automatic', 'member_choice');

-- CreateEnum
CREATE TYPE "PaymentAllocationLeftover" AS ENUM ('special_savings');

-- AlterTable
ALTER TABLE "member_payment_receipt_allocations" ADD COLUMN     "member_share_application_id" UUID;

-- AlterTable
ALTER TABLE "member_share_applications" ADD COLUMN     "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "payment_due" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tenant_policies" ADD COLUMN     "payment_allocation_leftover" "PaymentAllocationLeftover" NOT NULL DEFAULT 'special_savings',
ADD COLUMN     "payment_allocation_mode" "PaymentAllocationMode" NOT NULL DEFAULT 'automatic',
ADD COLUMN     "payment_allocation_order" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "member_receipt_allocs_tenant_share_application_idx" ON "member_payment_receipt_allocations"("tenant_id", "member_share_application_id");

-- AddForeignKey
ALTER TABLE "member_payment_receipt_allocations" ADD CONSTRAINT "member_payment_receipt_allocations_member_share_applicatio_fkey" FOREIGN KEY ("member_share_application_id") REFERENCES "member_share_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
