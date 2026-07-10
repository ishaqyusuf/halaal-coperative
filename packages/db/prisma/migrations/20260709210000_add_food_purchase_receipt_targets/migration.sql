ALTER TABLE "food_purchase_applications"
  ADD COLUMN "paid_amount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "paid_at" TIMESTAMPTZ(6);

ALTER TABLE "member_payment_receipt_allocations"
  ADD COLUMN "food_purchase_application_id" UUID;

ALTER TABLE "member_payment_receipt_allocations"
  ADD CONSTRAINT "member_payment_receipt_allocations_food_purchase_application_id_fkey"
  FOREIGN KEY ("food_purchase_application_id")
  REFERENCES "food_purchase_applications"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "member_receipt_allocs_tenant_food_application_idx"
  ON "member_payment_receipt_allocations" ("tenant_id", "food_purchase_application_id");
