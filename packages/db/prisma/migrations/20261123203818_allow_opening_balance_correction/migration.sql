/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,member_id,opening_date]` on the table `member_opening_balances` will be added. If there are existing duplicate values, this will fail.

*/
BEGIN;

-- DropIndex
DROP INDEX "member_opening_balances_member_date_key";

-- CreateIndex
CREATE UNIQUE INDEX "member_opening_balances_member_date_key" ON "member_opening_balances"("tenant_id", "member_id", "opening_date") WHERE (status <> 'reversed'::"MemberOpeningBalanceStatus");

COMMIT;
