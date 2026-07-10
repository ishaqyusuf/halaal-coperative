ALTER TABLE "member_opening_balances"
ADD COLUMN "applied_loan_id" uuid;

CREATE UNIQUE INDEX "member_opening_balances_applied_loan_key"
ON "member_opening_balances" ("applied_loan_id");

ALTER TABLE "member_opening_balances"
ADD CONSTRAINT "member_opening_balances_applied_loan_fkey"
FOREIGN KEY ("applied_loan_id") REFERENCES "loans"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
