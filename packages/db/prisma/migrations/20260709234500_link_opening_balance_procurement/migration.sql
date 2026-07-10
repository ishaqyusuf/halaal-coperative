ALTER TABLE "member_opening_balances"
ADD COLUMN "applied_procurement_request_id" uuid;

CREATE UNIQUE INDEX "member_opening_balances_applied_procurement_request_key"
ON "member_opening_balances" ("applied_procurement_request_id");

ALTER TABLE "member_opening_balances"
ADD CONSTRAINT "member_opening_balances_applied_procurement_request_fkey"
FOREIGN KEY ("applied_procurement_request_id") REFERENCES "procurement_requests"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
