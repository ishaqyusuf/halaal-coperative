-- CreateEnum
CREATE TYPE "ChargePurpose" AS ENUM ('general', 'member_share', 'loan_fee', 'membership_fee', 'penalty');

-- CreateEnum
CREATE TYPE "MemberShareSourceType" AS ENUM ('monthly_share_charge', 'backfill', 'manual_adjustment', 'import', 'reversal');

-- CreateEnum
CREATE TYPE "ProfitEntrySourceType" AS ENUM ('manual', 'backfill', 'import');

-- CreateEnum
CREATE TYPE "ShareProfitAllocationStatus" AS ENUM ('draft', 'published', 'cancelled');

-- AlterTable
ALTER TABLE "charge_definitions" ADD COLUMN "purpose" "ChargePurpose" NOT NULL DEFAULT 'general';

-- AlterTable
ALTER TABLE "monthly_record_members" ADD COLUMN "share_charge_amount" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "member_share_ledger_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "source_type" "MemberShareSourceType" NOT NULL,
    "source_id" UUID,
    "amount" DECIMAL(18,2) NOT NULL,
    "effective_date" DATE NOT NULL,
    "notes" TEXT,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_share_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_business_profit_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "share_business_id" UUID NOT NULL,
    "linked_dividend_period_id" UUID,
    "profit_amount" DECIMAL(18,2) NOT NULL,
    "profit_date" DATE NOT NULL,
    "notes" TEXT,
    "source_type" "ProfitEntrySourceType" NOT NULL DEFAULT 'manual',
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "share_business_profit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_profit_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "profit_entry_id" UUID NOT NULL,
    "member_share_balance" DECIMAL(18,2) NOT NULL,
    "total_share_balance" DECIMAL(18,2) NOT NULL,
    "share_percentage" DECIMAL(12,8) NOT NULL,
    "allocated_profit_amount" DECIMAL(18,2) NOT NULL,
    "status" "ShareProfitAllocationStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "share_profit_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_share_ledger_entries_tenant_member_effective_idx" ON "member_share_ledger_entries"("tenant_id", "member_id", "effective_date");

-- CreateIndex
CREATE INDEX "member_share_ledger_entries_tenant_effective_idx" ON "member_share_ledger_entries"("tenant_id", "effective_date");

-- CreateIndex
CREATE INDEX "member_share_ledger_entries_tenant_source_idx" ON "member_share_ledger_entries"("tenant_id", "source_type", "source_id");

-- CreateIndex
CREATE INDEX "share_business_profit_entries_tenant_profit_date_idx" ON "share_business_profit_entries"("tenant_id", "profit_date");

-- CreateIndex
CREATE INDEX "share_business_profit_entries_tenant_business_profit_date_idx" ON "share_business_profit_entries"("tenant_id", "share_business_id", "profit_date");

-- CreateIndex
CREATE UNIQUE INDEX "share_profit_allocations_profit_member_key" ON "share_profit_allocations"("profit_entry_id", "member_id");

-- CreateIndex
CREATE INDEX "share_profit_allocations_tenant_member_idx" ON "share_profit_allocations"("tenant_id", "member_id");

-- CreateIndex
CREATE INDEX "share_profit_allocations_tenant_status_idx" ON "share_profit_allocations"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "member_share_ledger_entries" ADD CONSTRAINT "member_share_ledger_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_share_ledger_entries" ADD CONSTRAINT "member_share_ledger_entries_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_business_profit_entries" ADD CONSTRAINT "share_business_profit_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_business_profit_entries" ADD CONSTRAINT "share_business_profit_entries_share_business_id_fkey" FOREIGN KEY ("share_business_id") REFERENCES "share_businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_business_profit_entries" ADD CONSTRAINT "share_business_profit_entries_linked_dividend_period_id_fkey" FOREIGN KEY ("linked_dividend_period_id") REFERENCES "dividend_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_profit_allocations" ADD CONSTRAINT "share_profit_allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_profit_allocations" ADD CONSTRAINT "share_profit_allocations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_profit_allocations" ADD CONSTRAINT "share_profit_allocations_profit_entry_id_fkey" FOREIGN KEY ("profit_entry_id") REFERENCES "share_business_profit_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
