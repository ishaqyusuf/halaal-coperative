ALTER TABLE "dividend_periods"
ADD COLUMN "deduction_amount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
ADD COLUMN "deduction_reason" TEXT;
