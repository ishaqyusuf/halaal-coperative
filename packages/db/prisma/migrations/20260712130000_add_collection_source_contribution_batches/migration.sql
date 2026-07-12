CREATE TYPE "CollectionSourceContributionBatchStatus" AS ENUM ('staged', 'partially_posted', 'posted', 'cancelled');

CREATE TYPE "CollectionSourceContributionBatchRowStatus" AS ENUM ('staged', 'collected', 'exception', 'posted', 'skipped', 'blocked');

CREATE TABLE "collection_source_contribution_batches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "deduction_source_id" UUID NOT NULL,
  "period_year" INTEGER NOT NULL,
  "period_month" INTEGER NOT NULL,
  "period_label" TEXT NOT NULL,
  "status" "CollectionSourceContributionBatchStatus" NOT NULL DEFAULT 'staged',
  "reference" TEXT,
  "notes" TEXT,
  "created_by_user_id" UUID NOT NULL,
  "posted_by_user_id" UUID,
  "posted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "collection_source_contribution_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "collection_source_contribution_batch_rows" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "batch_id" UUID NOT NULL,
  "member_id" UUID NOT NULL,
  "contribution_plan_id" UUID,
  "contribution_id" UUID,
  "expected_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "status" "CollectionSourceContributionBatchRowStatus" NOT NULL DEFAULT 'staged',
  "blocker" TEXT,
  "exception_reason" TEXT,
  "posted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "collection_source_contribution_batch_rows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "collection_source_batches_tenant_source_period_key" ON "collection_source_contribution_batches"("tenant_id", "deduction_source_id", "period_year", "period_month");
CREATE INDEX "collection_source_batches_tenant_status_idx" ON "collection_source_contribution_batches"("tenant_id", "status");
CREATE INDEX "collection_source_batches_tenant_period_idx" ON "collection_source_contribution_batches"("tenant_id", "period_year", "period_month");

CREATE UNIQUE INDEX "collection_source_batch_rows_batch_member_key" ON "collection_source_contribution_batch_rows"("batch_id", "member_id");
CREATE INDEX "collection_source_batch_rows_tenant_status_idx" ON "collection_source_contribution_batch_rows"("tenant_id", "status");
CREATE INDEX "collection_source_batch_rows_tenant_member_idx" ON "collection_source_contribution_batch_rows"("tenant_id", "member_id");

ALTER TABLE "collection_source_contribution_batches" ADD CONSTRAINT "collection_source_contribution_batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collection_source_contribution_batches" ADD CONSTRAINT "collection_source_contribution_batches_deduction_source_id_fkey" FOREIGN KEY ("deduction_source_id") REFERENCES "deduction_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "collection_source_contribution_batches" ADD CONSTRAINT "collection_source_contribution_batches_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "collection_source_contribution_batches" ADD CONSTRAINT "collection_source_contribution_batches_posted_by_user_id_fkey" FOREIGN KEY ("posted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "collection_source_contribution_batch_rows" ADD CONSTRAINT "collection_source_contribution_batch_rows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collection_source_contribution_batch_rows" ADD CONSTRAINT "collection_source_contribution_batch_rows_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "collection_source_contribution_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collection_source_contribution_batch_rows" ADD CONSTRAINT "collection_source_contribution_batch_rows_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collection_source_contribution_batch_rows" ADD CONSTRAINT "collection_source_contribution_batch_rows_contribution_plan_id_fkey" FOREIGN KEY ("contribution_plan_id") REFERENCES "contribution_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "collection_source_contribution_batch_rows" ADD CONSTRAINT "collection_source_contribution_batch_rows_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "contributions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
