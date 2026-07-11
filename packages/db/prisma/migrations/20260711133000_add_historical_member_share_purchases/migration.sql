CREATE TABLE "historical_member_share_purchases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "member_id" UUID NOT NULL,
  "share_units" INTEGER NOT NULL,
  "unit_amount_snapshot" DECIMAL(18, 2) NOT NULL,
  "share_capital_amount" DECIMAL(18, 2) NOT NULL,
  "paid_at" DATE NOT NULL,
  "notes" TEXT,
  "created_by_user_id" UUID,
  "posted_share_ledger_entry_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "historical_member_share_purchases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "historical_share_purchases_posted_share_ledger_entry_key"
  ON "historical_member_share_purchases"("posted_share_ledger_entry_id");

CREATE INDEX "historical_share_purchases_tenant_member_paid_idx"
  ON "historical_member_share_purchases"("tenant_id", "member_id", "paid_at");

CREATE INDEX "historical_share_purchases_tenant_paid_idx"
  ON "historical_member_share_purchases"("tenant_id", "paid_at");

ALTER TABLE "historical_member_share_purchases"
  ADD CONSTRAINT "historical_member_share_purchases_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "historical_member_share_purchases"
  ADD CONSTRAINT "historical_member_share_purchases_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "members"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "historical_member_share_purchases"
  ADD CONSTRAINT "historical_member_share_purchases_posted_share_ledger_entry_id_fkey"
  FOREIGN KEY ("posted_share_ledger_entry_id") REFERENCES "member_share_ledger_entries"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
