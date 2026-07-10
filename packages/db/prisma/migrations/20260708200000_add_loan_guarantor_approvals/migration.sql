CREATE TYPE "LoanGuarantorApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE "loan_guarantor_approvals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "loan_request_id" UUID NOT NULL,
    "guarantor_member_id" UUID NOT NULL,
    "requested_by_user_id" UUID NOT NULL,
    "responded_by_user_id" UUID,
    "status" "LoanGuarantorApprovalStatus" NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMPTZ(6) NOT NULL,
    "responded_at" TIMESTAMPTZ(6),
    "response_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "loan_guarantor_approvals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "loan_guarantor_approvals_request_guarantor_key" ON "loan_guarantor_approvals"("loan_request_id", "guarantor_member_id");
CREATE INDEX "loan_guarantor_approvals_tenant_status_idx" ON "loan_guarantor_approvals"("tenant_id", "status");
CREATE INDEX "loan_guarantor_approvals_tenant_guarantor_status_idx" ON "loan_guarantor_approvals"("tenant_id", "guarantor_member_id", "status");

ALTER TABLE "loan_guarantor_approvals" ADD CONSTRAINT "loan_guarantor_approvals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loan_guarantor_approvals" ADD CONSTRAINT "loan_guarantor_approvals_loan_request_id_fkey" FOREIGN KEY ("loan_request_id") REFERENCES "loan_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loan_guarantor_approvals" ADD CONSTRAINT "loan_guarantor_approvals_guarantor_member_id_fkey" FOREIGN KEY ("guarantor_member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "loan_guarantor_approvals" ADD CONSTRAINT "loan_guarantor_approvals_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "loan_guarantor_approvals" ADD CONSTRAINT "loan_guarantor_approvals_responded_by_user_id_fkey" FOREIGN KEY ("responded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
