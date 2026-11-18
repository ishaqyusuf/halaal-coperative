-- CreateEnum
CREATE TYPE "ProfitPayoutDestination" AS ENUM ('savings', 'cash', 'bank_transfer');

-- CreateEnum
CREATE TYPE "ProfitPayoutStatus" AS ENUM ('paid', 'reversed');

-- CreateTable
CREATE TABLE "profit_payouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "dividend_period_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "destination" "ProfitPayoutDestination" NOT NULL,
    "status" "ProfitPayoutStatus" NOT NULL DEFAULT 'paid',
    "reference" TEXT,
    "note" TEXT,
    "pay_count" INTEGER NOT NULL DEFAULT 1,
    "paid_at" TIMESTAMPTZ(6) NOT NULL,
    "paid_by_user_id" UUID NOT NULL,
    "ledger_transaction_id" UUID,
    "contribution_id" UUID,
    "reversed_at" TIMESTAMPTZ(6),
    "reversed_by_user_id" UUID,
    "reversal_reason" TEXT,
    "reversal_ledger_transaction_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profit_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profit_payouts_tenant_member_idx" ON "profit_payouts"("tenant_id", "member_id");

-- CreateIndex
CREATE INDEX "profit_payouts_tenant_period_status_idx" ON "profit_payouts"("tenant_id", "dividend_period_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "profit_payouts_period_member_key" ON "profit_payouts"("dividend_period_id", "member_id");

-- AddForeignKey
ALTER TABLE "profit_payouts" ADD CONSTRAINT "profit_payouts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_payouts" ADD CONSTRAINT "profit_payouts_dividend_period_id_fkey" FOREIGN KEY ("dividend_period_id") REFERENCES "dividend_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_payouts" ADD CONSTRAINT "profit_payouts_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
