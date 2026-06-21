CREATE TABLE "applied_backfill_months" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "member_id" UUID NOT NULL,
  "batch_id" UUID NOT NULL,
  "month" DATE NOT NULL,
  "source_key" TEXT NOT NULL,
  "applied_by_user_id" UUID,
  "applied_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "applied_backfill_months_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "applied_backfill_months_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "applied_backfill_months_member_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "applied_backfill_months_batch_fkey" FOREIGN KEY ("batch_id") REFERENCES "backfill_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "applied_backfill_months_member_month_key"
  ON "applied_backfill_months"("tenant_id", "member_id", "month");

CREATE UNIQUE INDEX "applied_backfill_months_source_key_key"
  ON "applied_backfill_months"("tenant_id", "source_key");

CREATE INDEX "applied_backfill_months_tenant_batch_idx"
  ON "applied_backfill_months"("tenant_id", "batch_id");

CREATE INDEX "applied_backfill_months_tenant_member_month_idx"
  ON "applied_backfill_months"("tenant_id", "member_id", "month");
