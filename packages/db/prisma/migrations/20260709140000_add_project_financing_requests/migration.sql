CREATE TYPE "ProjectFinancingStructure" AS ENUM ('undecided', 'repayable_facility', 'investment_partnership', 'profit_sharing');
CREATE TYPE "ProjectFinancingRequestStatus" AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'cancelled', 'active', 'completed');

CREATE TABLE "project_financing_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "reviewed_by_user_id" UUID,
    "business_name" TEXT NOT NULL,
    "business_description" TEXT,
    "project_purpose" TEXT,
    "proposed_structure" "ProjectFinancingStructure" NOT NULL DEFAULT 'undecided',
    "approved_structure" "ProjectFinancingStructure",
    "requested_amount" DECIMAL(18,2) NOT NULL,
    "approved_amount" DECIMAL(18,2),
    "requested_payback_months" INTEGER,
    "approved_payback_months" INTEGER,
    "estimated_monthly_payback" DECIMAL(18,2),
    "approved_monthly_payback" DECIMAL(18,2),
    "status" "ProjectFinancingRequestStatus" NOT NULL DEFAULT 'submitted',
    "requested_at" TIMESTAMPTZ(6) NOT NULL,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "project_financing_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_financing_requests_requested_amount_check" CHECK ("requested_amount" > 0),
    CONSTRAINT "project_financing_requests_approved_amount_check" CHECK ("approved_amount" IS NULL OR "approved_amount" > 0),
    CONSTRAINT "project_financing_requests_requested_payback_months_check" CHECK ("requested_payback_months" IS NULL OR "requested_payback_months" > 0),
    CONSTRAINT "project_financing_requests_approved_payback_months_check" CHECK ("approved_payback_months" IS NULL OR "approved_payback_months" > 0)
);

CREATE INDEX "project_financing_requests_tenant_status_requested_idx" ON "project_financing_requests"("tenant_id", "status", "requested_at");
CREATE INDEX "project_financing_requests_tenant_member_status_idx" ON "project_financing_requests"("tenant_id", "member_id", "status");

ALTER TABLE "project_financing_requests" ADD CONSTRAINT "project_financing_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_financing_requests" ADD CONSTRAINT "project_financing_requests_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_financing_requests" ADD CONSTRAINT "project_financing_requests_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_financing_requests" ADD CONSTRAINT "project_financing_requests_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
