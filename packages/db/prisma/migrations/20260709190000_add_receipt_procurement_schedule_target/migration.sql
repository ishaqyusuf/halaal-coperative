ALTER TABLE "member_payment_receipt_allocations"
  ADD COLUMN "procurement_repayment_schedule_item_id" UUID;

ALTER TABLE "member_payment_receipt_allocations"
  ADD CONSTRAINT "member_payment_receipt_allocations_procurement_schedule_item_id_fkey"
  FOREIGN KEY ("procurement_repayment_schedule_item_id")
  REFERENCES "procurement_repayment_schedule_items"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "member_receipt_allocs_tenant_proc_schedule_idx"
  ON "member_payment_receipt_allocations" ("tenant_id", "procurement_repayment_schedule_item_id");
