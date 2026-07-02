CREATE TYPE "BusinessProfitDistributionFrequency" AS ENUM ('annual', 'semi_annual', 'quarterly', 'ad_hoc');
CREATE TYPE "BusinessProfitDistributionBasis" AS ENUM ('share_capital_balance');
CREATE TYPE "BusinessProfitExpenseTreatment" AS ENUM ('deduct_reviewed_expenses_before_distribution');
CREATE TYPE "HistoricalProfitMigrationMode" AS ENUM ('manual_review_required', 'import_historical_profit_pools', 'no_historical_business_profit');

CREATE TABLE "tenant_business_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "profit_distribution_frequency" "BusinessProfitDistributionFrequency" NOT NULL DEFAULT 'annual',
  "financial_year_start_month" INTEGER NOT NULL DEFAULT 1,
  "distribution_basis" "BusinessProfitDistributionBasis" NOT NULL DEFAULT 'share_capital_balance',
  "default_distributable_percentage" DECIMAL(5, 2) NOT NULL DEFAULT 100,
  "reserve_retention_percentage" DECIMAL(5, 2) NOT NULL DEFAULT 0,
  "requires_profit_distribution_approval" BOOLEAN NOT NULL DEFAULT true,
  "expense_treatment" "BusinessProfitExpenseTreatment" NOT NULL DEFAULT 'deduct_reviewed_expenses_before_distribution',
  "historical_profit_migration_mode" "HistoricalProfitMigrationMode" NOT NULL DEFAULT 'manual_review_required',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "tenant_business_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_business_policies_tenant_id_key" ON "tenant_business_policies"("tenant_id");

ALTER TABLE "tenant_business_policies"
  ADD CONSTRAINT "tenant_business_policies_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
