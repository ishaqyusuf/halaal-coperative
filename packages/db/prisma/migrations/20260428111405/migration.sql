-- CreateEnum
CREATE TYPE "BackfillBatchStatus" AS ENUM ('draft', 'generated', 'approved', 'applied', 'cancelled');

-- CreateEnum
CREATE TYPE "BackfillActivityType" AS ENUM ('loan_taken', 'profit_dividend', 'extra_charge', 'extra_share', 'manual_adjustment', 'loan_repayment_adjustment');

-- AlterTable
ALTER TABLE "member_onboarding_requests" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "member_signup_links" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "tenant_share_structure_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "effective_from" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_share_structure_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_share_overrides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "effective_from" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "member_share_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_amount_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "effective_from" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "member_amount_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge_definition_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "charge_definition_id" UUID NOT NULL,
    "effective_from" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "kind" "ChargeKind" NOT NULL,
    "notes" TEXT,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "charge_definition_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backfill_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "range_start" DATE NOT NULL,
    "range_end" DATE NOT NULL,
    "status" "BackfillBatchStatus" NOT NULL DEFAULT 'draft',
    "generated_at" TIMESTAMPTZ(6),
    "approved_at" TIMESTAMPTZ(6),
    "applied_at" TIMESTAMPTZ(6),
    "created_by_user_id" UUID,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "backfill_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backfill_month_rows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "charge" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "loan_collected" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "loan_service_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "monthly_topup" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "pending_loan_payment" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "share" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_share" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "is_generated" BOOLEAN NOT NULL DEFAULT true,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "backfill_month_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backfill_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "month_row_id" UUID NOT NULL,
    "activity_type" "BackfillActivityType" NOT NULL,
    "activity_date" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'credit',
    "notes" TEXT,
    "metadata" JSONB,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "backfill_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_share_versions_tenant_effective_idx" ON "tenant_share_structure_versions"("tenant_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_share_versions_tenant_effective_key" ON "tenant_share_structure_versions"("tenant_id", "effective_from");

-- CreateIndex
CREATE INDEX "member_share_overrides_tenant_member_effective_idx" ON "member_share_overrides"("tenant_id", "member_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "member_share_overrides_member_effective_key" ON "member_share_overrides"("member_id", "effective_from");

-- CreateIndex
CREATE INDEX "member_amount_logs_tenant_member_effective_idx" ON "member_amount_logs"("tenant_id", "member_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "member_amount_logs_member_effective_key" ON "member_amount_logs"("member_id", "effective_from");

-- CreateIndex
CREATE INDEX "charge_definition_versions_tenant_definition_effective_idx" ON "charge_definition_versions"("tenant_id", "charge_definition_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "charge_definition_versions_definition_effective_key" ON "charge_definition_versions"("charge_definition_id", "effective_from");

-- CreateIndex
CREATE INDEX "backfill_batches_tenant_member_status_idx" ON "backfill_batches"("tenant_id", "member_id", "status");

-- CreateIndex
CREATE INDEX "backfill_batches_tenant_created_at_idx" ON "backfill_batches"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "backfill_month_rows_tenant_batch_idx" ON "backfill_month_rows"("tenant_id", "batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "backfill_month_rows_batch_year_month_key" ON "backfill_month_rows"("batch_id", "year", "month");

-- CreateIndex
CREATE INDEX "backfill_activities_tenant_batch_idx" ON "backfill_activities"("tenant_id", "batch_id");

-- CreateIndex
CREATE INDEX "backfill_activities_month_row_date_idx" ON "backfill_activities"("month_row_id", "activity_date");

-- RenameForeignKey
ALTER TABLE "member_onboarding_requests" RENAME CONSTRAINT "member_onboarding_requests_signup_link_fkey" TO "member_onboarding_requests_signup_link_id_fkey";

-- RenameForeignKey
ALTER TABLE "member_onboarding_requests" RENAME CONSTRAINT "member_onboarding_requests_tenant_fkey" TO "member_onboarding_requests_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "member_onboarding_requests" RENAME CONSTRAINT "member_onboarding_requests_user_fkey" TO "member_onboarding_requests_user_id_fkey";

-- RenameForeignKey
ALTER TABLE "member_signup_links" RENAME CONSTRAINT "member_signup_links_created_by_user_fkey" TO "member_signup_links_created_by_user_id_fkey";

-- RenameForeignKey
ALTER TABLE "member_signup_links" RENAME CONSTRAINT "member_signup_links_tenant_fkey" TO "member_signup_links_tenant_id_fkey";

-- AddForeignKey
ALTER TABLE "tenant_share_structure_versions" ADD CONSTRAINT "tenant_share_structure_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_share_overrides" ADD CONSTRAINT "member_share_overrides_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_share_overrides" ADD CONSTRAINT "member_share_overrides_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_amount_logs" ADD CONSTRAINT "member_amount_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_amount_logs" ADD CONSTRAINT "member_amount_logs_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_definition_versions" ADD CONSTRAINT "charge_definition_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_definition_versions" ADD CONSTRAINT "charge_definition_versions_charge_definition_id_fkey" FOREIGN KEY ("charge_definition_id") REFERENCES "charge_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backfill_batches" ADD CONSTRAINT "backfill_batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backfill_batches" ADD CONSTRAINT "backfill_batches_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backfill_month_rows" ADD CONSTRAINT "backfill_month_rows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backfill_month_rows" ADD CONSTRAINT "backfill_month_rows_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "backfill_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backfill_activities" ADD CONSTRAINT "backfill_activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backfill_activities" ADD CONSTRAINT "backfill_activities_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "backfill_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backfill_activities" ADD CONSTRAINT "backfill_activities_month_row_id_fkey" FOREIGN KEY ("month_row_id") REFERENCES "backfill_month_rows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
