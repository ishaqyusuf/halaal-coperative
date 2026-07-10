CREATE TYPE "FoodPurchaseCycleStatus" AS ENUM ('open', 'accounting_submitted', 'accounting_approved', 'accounting_rejected', 'closed', 'cancelled');
CREATE TYPE "FoodPurchaseApplicationStatus" AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'cancelled');

CREATE TABLE "food_purchase_cycles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "released_by_user_id" UUID NOT NULL,
    "accounting_submitted_by_user_id" UUID,
    "period_month" DATE NOT NULL,
    "released_amount" DECIMAL(18,2) NOT NULL,
    "released_at" TIMESTAMPTZ(6) NOT NULL,
    "release_notes" TEXT,
    "sales_amount" DECIMAL(18,2),
    "purchase_cost_amount" DECIMAL(18,2),
    "operating_expense_amount" DECIMAL(18,2),
    "profit_amount" DECIMAL(18,2),
    "accounting_notes" TEXT,
    "accounting_submitted_at" TIMESTAMPTZ(6),
    "status" "FoodPurchaseCycleStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "food_purchase_cycles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "food_purchase_cycles_released_amount_check" CHECK ("released_amount" > 0),
    CONSTRAINT "food_purchase_cycles_accounting_amounts_check" CHECK (
        ("sales_amount" IS NULL OR "sales_amount" >= 0)
        AND ("purchase_cost_amount" IS NULL OR "purchase_cost_amount" >= 0)
        AND ("operating_expense_amount" IS NULL OR "operating_expense_amount" >= 0)
    )
);

CREATE TABLE "food_purchase_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "submitted_by_user_id" UUID NOT NULL,
    "reviewed_by_user_id" UUID,
    "item_description" TEXT,
    "request_notes" TEXT,
    "requested_amount" DECIMAL(18,2) NOT NULL,
    "approved_amount" DECIMAL(18,2),
    "status" "FoodPurchaseApplicationStatus" NOT NULL DEFAULT 'submitted',
    "requested_at" TIMESTAMPTZ(6) NOT NULL,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "food_purchase_applications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "food_purchase_applications_requested_amount_check" CHECK ("requested_amount" > 0),
    CONSTRAINT "food_purchase_applications_approved_amount_check" CHECK ("approved_amount" IS NULL OR "approved_amount" > 0)
);

CREATE UNIQUE INDEX "food_purchase_cycles_tenant_period_key" ON "food_purchase_cycles"("tenant_id", "period_month");
CREATE INDEX "food_purchase_cycles_tenant_status_period_idx" ON "food_purchase_cycles"("tenant_id", "status", "period_month");
CREATE INDEX "food_purchase_applications_tenant_cycle_status_idx" ON "food_purchase_applications"("tenant_id", "cycle_id", "status");
CREATE INDEX "food_purchase_applications_tenant_member_status_idx" ON "food_purchase_applications"("tenant_id", "member_id", "status");

ALTER TABLE "food_purchase_cycles" ADD CONSTRAINT "food_purchase_cycles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "food_purchase_cycles" ADD CONSTRAINT "food_purchase_cycles_released_by_user_id_fkey" FOREIGN KEY ("released_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "food_purchase_cycles" ADD CONSTRAINT "food_purchase_cycles_accounting_submitted_by_user_id_fkey" FOREIGN KEY ("accounting_submitted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "food_purchase_applications" ADD CONSTRAINT "food_purchase_applications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "food_purchase_applications" ADD CONSTRAINT "food_purchase_applications_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "food_purchase_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "food_purchase_applications" ADD CONSTRAINT "food_purchase_applications_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "food_purchase_applications" ADD CONSTRAINT "food_purchase_applications_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "food_purchase_applications" ADD CONSTRAINT "food_purchase_applications_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
