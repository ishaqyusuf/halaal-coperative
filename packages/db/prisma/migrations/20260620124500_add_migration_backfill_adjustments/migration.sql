CREATE TABLE "migration_backfill_adjustments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "member_id" UUID NOT NULL,
  "month" DATE NOT NULL,
  "savings_contribution" DECIMAL(18, 2),
  "loan_repayment_amount" DECIMAL(18, 2),
  "notes" TEXT,
  "created_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "migration_backfill_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "migration_backfill_adjustments_member_month_key"
ON "migration_backfill_adjustments"("tenant_id", "member_id", "month");

CREATE INDEX "migration_backfill_adjustments_tenant_member_month_idx"
ON "migration_backfill_adjustments"("tenant_id", "member_id", "month");

ALTER TABLE "migration_backfill_adjustments"
ADD CONSTRAINT "migration_backfill_adjustments_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "migration_backfill_adjustments"
ADD CONSTRAINT "migration_backfill_adjustments_member_id_fkey"
FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
