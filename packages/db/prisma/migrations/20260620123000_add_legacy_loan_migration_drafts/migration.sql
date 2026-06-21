CREATE TABLE "legacy_loan_migration_drafts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "member_id" UUID NOT NULL,
  "loan_label" TEXT NOT NULL,
  "opened_at" DATE NOT NULL,
  "closed_at" DATE,
  "principal_amount" DECIMAL(18, 2) NOT NULL,
  "scheduled_monthly_principal_repayment" DECIMAL(18, 2) NOT NULL,
  "savings_during_loan" DECIMAL(18, 2) NOT NULL,
  "outstanding_principal_balance" DECIMAL(18, 2) NOT NULL,
  "notes" TEXT,
  "created_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "legacy_loan_migration_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "legacy_loan_migration_drafts_member_label_opened_key"
ON "legacy_loan_migration_drafts"("tenant_id", "member_id", "loan_label", "opened_at");

CREATE INDEX "legacy_loan_migration_drafts_tenant_member_opened_idx"
ON "legacy_loan_migration_drafts"("tenant_id", "member_id", "opened_at");

CREATE INDEX "legacy_loan_migration_drafts_tenant_opened_idx"
ON "legacy_loan_migration_drafts"("tenant_id", "opened_at");

ALTER TABLE "legacy_loan_migration_drafts"
ADD CONSTRAINT "legacy_loan_migration_drafts_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "legacy_loan_migration_drafts"
ADD CONSTRAINT "legacy_loan_migration_drafts_member_id_fkey"
FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
