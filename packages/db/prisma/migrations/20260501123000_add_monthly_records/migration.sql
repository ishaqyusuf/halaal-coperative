CREATE TYPE "MonthlyRecordStatus" AS ENUM ('draft', 'open', 'closed');

CREATE TYPE "MonthlyRecordMemberStatus" AS ENUM ('pending', 'applied', 'cancelled');

CREATE TABLE "monthly_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "period_year" INTEGER NOT NULL,
  "period_month" INTEGER NOT NULL,
  "period_label" TEXT NOT NULL,
  "status" "MonthlyRecordStatus" NOT NULL DEFAULT 'open',
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "monthly_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "monthly_record_members" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "monthly_record_id" UUID NOT NULL,
  "member_id" UUID NOT NULL,
  "contribution_plan_id" UUID,
  "loan_id" UUID,
  "calculated_payable_amount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "contribution_amount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "loan_repayment_amount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "total_paid_amount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "contribution_id" UUID,
  "repayment_id" UUID,
  "status" "MonthlyRecordMemberStatus" NOT NULL DEFAULT 'pending',
  "applied_at" TIMESTAMPTZ(6),
  "cancelled_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "monthly_record_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "monthly_records_tenant_period_key" ON "monthly_records"("tenant_id", "period_year", "period_month");
CREATE INDEX "monthly_records_tenant_period_idx" ON "monthly_records"("tenant_id", "period_year", "period_month");
CREATE INDEX "monthly_records_tenant_status_idx" ON "monthly_records"("tenant_id", "status");
CREATE UNIQUE INDEX "monthly_record_members_record_member_key" ON "monthly_record_members"("monthly_record_id", "member_id");
CREATE INDEX "monthly_record_members_tenant_status_idx" ON "monthly_record_members"("tenant_id", "status");
CREATE INDEX "monthly_record_members_tenant_member_idx" ON "monthly_record_members"("tenant_id", "member_id");

ALTER TABLE "monthly_records"
ADD CONSTRAINT "monthly_records_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "monthly_record_members"
ADD CONSTRAINT "monthly_record_members_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "monthly_record_members"
ADD CONSTRAINT "monthly_record_members_monthly_record_id_fkey"
FOREIGN KEY ("monthly_record_id") REFERENCES "monthly_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "monthly_record_members"
ADD CONSTRAINT "monthly_record_members_member_id_fkey"
FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
