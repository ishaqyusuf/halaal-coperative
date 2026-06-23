ALTER TABLE "legacy_loan_migration_drafts"
  ADD COLUMN "guarantor_one_member_id" UUID,
  ADD COLUMN "guarantor_two_member_id" UUID;

CREATE INDEX "legacy_loan_migration_drafts_tenant_g1_idx"
  ON "legacy_loan_migration_drafts"("tenant_id", "guarantor_one_member_id");

CREATE INDEX "legacy_loan_migration_drafts_tenant_g2_idx"
  ON "legacy_loan_migration_drafts"("tenant_id", "guarantor_two_member_id");

ALTER TABLE "legacy_loan_migration_drafts"
  ADD CONSTRAINT "legacy_loan_migration_drafts_g1_member_fkey"
  FOREIGN KEY ("guarantor_one_member_id")
  REFERENCES "members"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "legacy_loan_migration_drafts"
  ADD CONSTRAINT "legacy_loan_migration_drafts_g2_member_fkey"
  FOREIGN KEY ("guarantor_two_member_id")
  REFERENCES "members"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
