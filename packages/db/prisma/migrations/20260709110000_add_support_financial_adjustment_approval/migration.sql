CREATE TYPE "SupportFinancialAdjustmentApprovalStatus" AS ENUM ('not_required', 'pending', 'approved', 'rejected');

ALTER TABLE "support_cases"
  ADD COLUMN "financial_adjustment_approval_status" "SupportFinancialAdjustmentApprovalStatus" NOT NULL DEFAULT 'not_required',
  ADD COLUMN "financial_adjustment_approved_by_user_id" uuid,
  ADD COLUMN "financial_adjustment_approved_at" timestamptz(6),
  ADD COLUMN "financial_adjustment_approval_notes" text;

UPDATE "support_cases"
SET "financial_adjustment_approval_status" = 'pending'
WHERE "requires_financial_adjustment" = true;

ALTER TABLE "support_cases"
  ADD CONSTRAINT "support_cases_financial_adjustment_approved_by_user_id_fkey"
    FOREIGN KEY ("financial_adjustment_approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "support_cases_tenant_fin_adj_approval_idx"
  ON "support_cases" ("tenant_id", "financial_adjustment_approval_status");
