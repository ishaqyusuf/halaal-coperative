ALTER TYPE "MemberShareSourceType" ADD VALUE 'payment_receipt';

ALTER TABLE "member_payment_receipt_allocations"
  ADD COLUMN "posted_share_ledger_entry_id" UUID;

ALTER TABLE "member_payment_receipt_allocations"
  ADD CONSTRAINT "member_payment_receipt_allocations_posted_share_ledger_entry_id_fkey"
  FOREIGN KEY ("posted_share_ledger_entry_id")
  REFERENCES "member_share_ledger_entries"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
