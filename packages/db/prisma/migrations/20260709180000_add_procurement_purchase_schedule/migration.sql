ALTER TABLE "procurement_requests"
  ADD COLUMN "purchased_at" TIMESTAMPTZ(6),
  ADD COLUMN "purchased_by_user_id" UUID,
  ADD COLUMN "purchase_reference" TEXT,
  ADD COLUMN "purchase_notes" TEXT;

CREATE TABLE "procurement_repayment_schedule_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "member_id" UUID NOT NULL,
  "procurement_request_id" UUID NOT NULL,
  "installment_number" INTEGER NOT NULL,
  "due_date" DATE NOT NULL,
  "amount" DECIMAL(18, 2) NOT NULL,
  "paid_amount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "status" "RepaymentScheduleStatus" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "procurement_repayment_schedule_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "procurement_repayment_schedule_request_installment_key"
  ON "procurement_repayment_schedule_items" ("procurement_request_id", "installment_number");

CREATE INDEX "procurement_repayment_schedule_tenant_member_status_idx"
  ON "procurement_repayment_schedule_items" ("tenant_id", "member_id", "status");

CREATE INDEX "procurement_repayment_schedule_tenant_due_status_idx"
  ON "procurement_repayment_schedule_items" ("tenant_id", "due_date", "status");

ALTER TABLE "procurement_repayment_schedule_items"
  ADD CONSTRAINT "procurement_repayment_schedule_items_tenant_id_fkey"
  FOREIGN KEY ("tenant_id")
  REFERENCES "tenants"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "procurement_repayment_schedule_items"
  ADD CONSTRAINT "procurement_repayment_schedule_items_member_id_fkey"
  FOREIGN KEY ("member_id")
  REFERENCES "members"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "procurement_repayment_schedule_items"
  ADD CONSTRAINT "procurement_repayment_schedule_items_procurement_request_id_fkey"
  FOREIGN KEY ("procurement_request_id")
  REFERENCES "procurement_requests"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
