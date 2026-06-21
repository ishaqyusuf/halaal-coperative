CREATE TYPE "ProfitEntryStatus" AS ENUM ('draft', 'reviewed', 'approved', 'archived');

ALTER TABLE "share_business_profit_entries"
  ADD COLUMN "expense_amount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "allocatable_profit_amount" DECIMAL(18, 2),
  ADD COLUMN "reason" TEXT,
  ADD COLUMN "status" "ProfitEntryStatus" NOT NULL DEFAULT 'draft';

UPDATE "share_business_profit_entries"
SET "allocatable_profit_amount" = GREATEST(0, "profit_amount" - "expense_amount")
WHERE "allocatable_profit_amount" IS NULL;

ALTER TABLE "share_business_profit_entries"
  ALTER COLUMN "allocatable_profit_amount" SET NOT NULL;
