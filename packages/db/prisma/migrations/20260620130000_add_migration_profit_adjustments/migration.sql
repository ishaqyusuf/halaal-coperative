CREATE TABLE "migration_profit_adjustments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "member_id" UUID NOT NULL,
  "profit_entry_id" UUID NOT NULL,
  "allocated_profit_amount" DECIMAL(18, 2),
  "share_percentage" DECIMAL(12, 8),
  "notes" TEXT,
  "created_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "migration_profit_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "migration_profit_adjustments_member_profit_key"
ON "migration_profit_adjustments"("tenant_id", "member_id", "profit_entry_id");

CREATE INDEX "migration_profit_adjustments_tenant_member_idx"
ON "migration_profit_adjustments"("tenant_id", "member_id");

CREATE INDEX "migration_profit_adjustments_tenant_profit_idx"
ON "migration_profit_adjustments"("tenant_id", "profit_entry_id");

ALTER TABLE "migration_profit_adjustments"
ADD CONSTRAINT "migration_profit_adjustments_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "migration_profit_adjustments"
ADD CONSTRAINT "migration_profit_adjustments_member_id_fkey"
FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "migration_profit_adjustments"
ADD CONSTRAINT "migration_profit_adjustments_profit_entry_id_fkey"
FOREIGN KEY ("profit_entry_id") REFERENCES "share_business_profit_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
