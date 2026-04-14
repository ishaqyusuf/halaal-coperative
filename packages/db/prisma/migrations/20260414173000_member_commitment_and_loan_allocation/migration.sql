ALTER TABLE "loan_requests"
ADD COLUMN "requested_term_months" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "estimated_monthly_servicing" DECIMAL(18, 2) NOT NULL DEFAULT 0,
ADD COLUMN "extra_monthly_savings_amount" DECIMAL(18, 2) NOT NULL DEFAULT 0;

ALTER TABLE "loans"
ADD COLUMN "term_months" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "estimated_monthly_servicing" DECIMAL(18, 2) NOT NULL DEFAULT 0,
ADD COLUMN "extra_monthly_savings_amount" DECIMAL(18, 2) NOT NULL DEFAULT 0;

ALTER TABLE "contributions"
ADD COLUMN "committed_amount" DECIMAL(18, 2),
ADD COLUMN "extra_savings_amount" DECIMAL(18, 2) NOT NULL DEFAULT 0;
