-- CreateEnum
CREATE TYPE "MemberPaymentReceiptStatus" AS ENUM ('submitted', 'under_review', 'correction_requested', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "MemberPaymentReceiptAllocationCategory" AS ENUM ('commitment', 'special_savings', 'loan_servicing', 'loan_extra_payment', 'shares', 'procurement', 'food_purchase', 'other');

-- CreateEnum
CREATE TYPE "MemberPaymentReceiptPeriodIntent" AS ENUM ('current_period', 'future_period', 'back_period', 'unspecified');

-- CreateTable
CREATE TABLE "member_payment_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "submitted_by_user_id" UUID,
    "reviewed_by_user_id" UUID,
    "paid_at" TIMESTAMPTZ(6) NOT NULL,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),
    "total_amount" DECIMAL(18,2) NOT NULL,
    "channel" "ContributionChannel" NOT NULL DEFAULT 'transfer',
    "payment_reference" TEXT,
    "proof_document_url" TEXT,
    "proof_document_name" TEXT,
    "status" "MemberPaymentReceiptStatus" NOT NULL DEFAULT 'submitted',
    "member_notes" TEXT,
    "review_notes" TEXT,
    "adjustment_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "member_payment_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_payment_receipt_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "receipt_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "category" "MemberPaymentReceiptAllocationCategory" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "target_period_start" DATE,
    "period_intent" "MemberPaymentReceiptPeriodIntent" NOT NULL DEFAULT 'unspecified',
    "contribution_plan_id" UUID,
    "loan_id" UUID,
    "posted_contribution_id" UUID,
    "posted_repayment_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "member_payment_receipt_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_payment_receipts_tenant_status_submitted_idx" ON "member_payment_receipts"("tenant_id", "status", "submitted_at");

-- CreateIndex
CREATE INDEX "member_payment_receipts_tenant_member_status_idx" ON "member_payment_receipts"("tenant_id", "member_id", "status");

-- CreateIndex
CREATE INDEX "member_payment_receipts_tenant_reference_idx" ON "member_payment_receipts"("tenant_id", "payment_reference");

-- CreateIndex
CREATE INDEX "member_payment_receipt_allocations_tenant_receipt_idx" ON "member_payment_receipt_allocations"("tenant_id", "receipt_id");

-- CreateIndex
CREATE INDEX "member_payment_receipt_allocations_tenant_member_period_idx" ON "member_payment_receipt_allocations"("tenant_id", "member_id", "target_period_start");

-- CreateIndex
CREATE INDEX "member_payment_receipt_allocations_tenant_category_idx" ON "member_payment_receipt_allocations"("tenant_id", "category");

-- AddForeignKey
ALTER TABLE "member_payment_receipts" ADD CONSTRAINT "member_payment_receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_payment_receipts" ADD CONSTRAINT "member_payment_receipts_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_payment_receipts" ADD CONSTRAINT "member_payment_receipts_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_payment_receipts" ADD CONSTRAINT "member_payment_receipts_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_payment_receipt_allocations" ADD CONSTRAINT "member_payment_receipt_allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_payment_receipt_allocations" ADD CONSTRAINT "member_payment_receipt_allocations_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "member_payment_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_payment_receipt_allocations" ADD CONSTRAINT "member_payment_receipt_allocations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_payment_receipt_allocations" ADD CONSTRAINT "member_payment_receipt_allocations_contribution_plan_id_fkey" FOREIGN KEY ("contribution_plan_id") REFERENCES "contribution_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_payment_receipt_allocations" ADD CONSTRAINT "member_payment_receipt_allocations_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_payment_receipt_allocations" ADD CONSTRAINT "member_payment_receipt_allocations_posted_contribution_id_fkey" FOREIGN KEY ("posted_contribution_id") REFERENCES "contributions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_payment_receipt_allocations" ADD CONSTRAINT "member_payment_receipt_allocations_posted_repayment_id_fkey" FOREIGN KEY ("posted_repayment_id") REFERENCES "repayments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
