-- CreateEnum
CREATE TYPE "ShareBusinessStatus" AS ENUM ('planned', 'active', 'completed', 'archived');

-- AlterTable
ALTER TABLE "backfill_batches" ADD COLUMN     "draft_input" JSONB,
ADD COLUMN     "summary" JSONB,
ADD COLUMN     "warnings" JSONB;

-- AlterTable
ALTER TABLE "backfill_month_rows" ADD COLUMN     "charge_breakdown" JSONB,
ADD COLUMN     "dividend" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "row_status" TEXT NOT NULL DEFAULT 'active';

-- CreateTable
CREATE TABLE "share_businesses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "linked_dividend_period_id" UUID,
    "name" TEXT NOT NULL,
    "capital_amount" DECIMAL(18,2) NOT NULL,
    "profit_amount" DECIMAL(18,2) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "status" "ShareBusinessStatus" NOT NULL DEFAULT 'planned',
    "notes" TEXT,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "share_businesses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "share_businesses_tenant_status_idx" ON "share_businesses"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "share_businesses_tenant_start_date_idx" ON "share_businesses"("tenant_id", "start_date");

-- AddForeignKey
ALTER TABLE "share_businesses" ADD CONSTRAINT "share_businesses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_businesses" ADD CONSTRAINT "share_businesses_linked_dividend_period_id_fkey" FOREIGN KEY ("linked_dividend_period_id") REFERENCES "dividend_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
