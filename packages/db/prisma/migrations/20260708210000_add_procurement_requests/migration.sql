CREATE TYPE "ProcurementRequestStatus" AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'cancelled', 'purchased', 'active', 'completed');

CREATE TABLE "procurement_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "reviewed_by_user_id" UUID,
    "item_name" TEXT NOT NULL,
    "item_description" TEXT,
    "vendor_name" TEXT,
    "requested_cost" DECIMAL(18,2) NOT NULL,
    "approved_cost" DECIMAL(18,2),
    "requested_repayment_months" INTEGER NOT NULL,
    "approved_repayment_months" INTEGER,
    "estimated_monthly_repayment" DECIMAL(18,2) NOT NULL,
    "approved_monthly_repayment" DECIMAL(18,2),
    "status" "ProcurementRequestStatus" NOT NULL DEFAULT 'submitted',
    "requested_at" TIMESTAMPTZ(6) NOT NULL,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "procurement_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "procurement_requests_tenant_status_requested_idx" ON "procurement_requests"("tenant_id", "status", "requested_at");
CREATE INDEX "procurement_requests_tenant_member_status_idx" ON "procurement_requests"("tenant_id", "member_id", "status");

ALTER TABLE "procurement_requests" ADD CONSTRAINT "procurement_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "procurement_requests" ADD CONSTRAINT "procurement_requests_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "procurement_requests" ADD CONSTRAINT "procurement_requests_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "procurement_requests" ADD CONSTRAINT "procurement_requests_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
