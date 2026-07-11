ALTER TABLE "member_opening_balances"
  ADD COLUMN "food_purchase_outstanding" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "active_financing_opened_at" DATE,
  ADD COLUMN "active_financing_guarantor_one_member_id" UUID,
  ADD COLUMN "active_financing_guarantor_two_member_id" UUID,
  ADD COLUMN "applied_food_purchase_application_id" UUID;

CREATE UNIQUE INDEX "member_opening_balances_applied_food_purchase_application_key"
  ON "member_opening_balances"("applied_food_purchase_application_id");

ALTER TABLE "member_opening_balances"
  ADD CONSTRAINT "member_opening_balances_applied_food_purchase_application_id_fkey"
  FOREIGN KEY ("applied_food_purchase_application_id")
  REFERENCES "food_purchase_applications"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
