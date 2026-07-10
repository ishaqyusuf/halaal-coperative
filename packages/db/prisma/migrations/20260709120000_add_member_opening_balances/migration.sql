CREATE TYPE "MemberOpeningBalanceStatus" AS ENUM ('pending_review', 'approved', 'rejected', 'cancelled');

CREATE TABLE "member_opening_balances" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "member_id" uuid NOT NULL,
  "opening_date" date NOT NULL,
  "status" "MemberOpeningBalanceStatus" NOT NULL DEFAULT 'pending_review',
  "commitment_savings_balance" numeric(18, 2) NOT NULL DEFAULT 0,
  "special_savings_balance" numeric(18, 2) NOT NULL DEFAULT 0,
  "share_capital_balance" numeric(18, 2) NOT NULL DEFAULT 0,
  "share_units" integer,
  "active_financing_outstanding" numeric(18, 2) NOT NULL DEFAULT 0,
  "procurement_outstanding" numeric(18, 2) NOT NULL DEFAULT 0,
  "source_document_url" text,
  "source_document_name" text,
  "notes" text,
  "review_notes" text,
  "created_by_user_id" uuid,
  "reviewed_by_user_id" uuid,
  "reviewed_at" timestamptz(6),
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "member_opening_balances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "member_opening_balances_amounts_non_negative"
    CHECK (
      "commitment_savings_balance" >= 0
      AND "special_savings_balance" >= 0
      AND "share_capital_balance" >= 0
      AND "active_financing_outstanding" >= 0
      AND "procurement_outstanding" >= 0
    ),
  CONSTRAINT "member_opening_balances_share_units_non_negative"
    CHECK ("share_units" IS NULL OR "share_units" >= 0)
);

CREATE UNIQUE INDEX "member_opening_balances_member_date_key"
  ON "member_opening_balances" ("tenant_id", "member_id", "opening_date");

CREATE INDEX "member_opening_balances_tenant_status_idx"
  ON "member_opening_balances" ("tenant_id", "status");

CREATE INDEX "member_opening_balances_tenant_member_status_idx"
  ON "member_opening_balances" ("tenant_id", "member_id", "status");

ALTER TABLE "member_opening_balances"
  ADD CONSTRAINT "member_opening_balances_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "member_opening_balances"
  ADD CONSTRAINT "member_opening_balances_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
