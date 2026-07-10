ALTER TYPE "MemberPaymentReceiptAllocationCategory"
  ADD VALUE IF NOT EXISTS 'project_financing';

ALTER TABLE "project_financing_requests"
  ADD COLUMN "paid_amount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "paid_at" TIMESTAMPTZ(6);

ALTER TABLE "member_payment_receipt_allocations"
  ADD COLUMN "project_financing_request_id" UUID;

ALTER TABLE "member_payment_receipt_allocations"
  ADD CONSTRAINT "member_payment_receipt_allocations_project_financing_request_id_fkey"
  FOREIGN KEY ("project_financing_request_id")
  REFERENCES "project_financing_requests"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "member_receipt_allocs_tenant_project_financing_idx"
  ON "member_payment_receipt_allocations" ("tenant_id", "project_financing_request_id");
