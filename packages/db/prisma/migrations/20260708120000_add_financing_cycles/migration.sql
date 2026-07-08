CREATE TYPE "FinancingCapacityBasis" AS ENUM ('projected_monthly_commitments');
CREATE TYPE "LoanIntakeReservationMode" AS ENUM ('submitted_request_amount');
CREATE TYPE "FinancingCycleStatus" AS ENUM ('draft', 'open', 'paused', 'closed');

ALTER TABLE "tenant_policies"
ADD COLUMN "financing_capacity_basis" "FinancingCapacityBasis" NOT NULL DEFAULT 'projected_monthly_commitments',
ADD COLUMN "quick_loan_allocation_percentage" DECIMAL(5, 2) NOT NULL DEFAULT 30,
ADD COLUMN "normal_loan_allocation_percentage" DECIMAL(5, 2) NOT NULL DEFAULT 70,
ADD COLUMN "loan_intake_reservation_mode" "LoanIntakeReservationMode" NOT NULL DEFAULT 'submitted_request_amount',
ADD COLUMN "disbursement_requires_deployable_funds" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "financing_cycles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "period_start" DATE NOT NULL,
  "period_end" DATE NOT NULL,
  "status" "FinancingCycleStatus" NOT NULL DEFAULT 'draft',
  "capacity_basis" "FinancingCapacityBasis" NOT NULL,
  "intake_reservation_mode" "LoanIntakeReservationMode" NOT NULL,
  "projected_commitment_amount" DECIMAL(18, 2) NOT NULL,
  "received_contribution_amount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "reserve_buffer_amount" DECIMAL(18, 2) NOT NULL,
  "total_capacity_amount" DECIMAL(18, 2) NOT NULL,
  "quick_allocation_percentage" DECIMAL(5, 2) NOT NULL,
  "normal_allocation_percentage" DECIMAL(5, 2) NOT NULL,
  "quick_budget_amount" DECIMAL(18, 2) NOT NULL,
  "normal_budget_amount" DECIMAL(18, 2) NOT NULL,
  "opened_at" TIMESTAMPTZ(6),
  "paused_at" TIMESTAMPTZ(6),
  "closed_at" TIMESTAMPTZ(6),
  "status_note" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "financing_cycles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financing_cycles_tenant_period_key" ON "financing_cycles"("tenant_id", "period_start", "period_end");
CREATE INDEX "financing_cycles_tenant_status_idx" ON "financing_cycles"("tenant_id", "status");
CREATE INDEX "financing_cycles_tenant_period_start_idx" ON "financing_cycles"("tenant_id", "period_start");

ALTER TABLE "financing_cycles"
ADD CONSTRAINT "financing_cycles_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
