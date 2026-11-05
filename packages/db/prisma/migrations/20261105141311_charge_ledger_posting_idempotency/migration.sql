/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,workflow_idempotency_key]` on the table `charge_applications` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,idempotency_key]` on the table `ledger_transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "charge_applications" ADD COLUMN     "applicability_snapshot" JSONB,
ADD COLUMN     "workflow_idempotency_key" TEXT;

-- AlterTable
ALTER TABLE "ledger_transactions" ADD COLUMN     "idempotency_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "charge_applications_tenant_workflow_key" ON "charge_applications"("tenant_id", "workflow_idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_transactions_tenant_idempotency_key" ON "ledger_transactions"("tenant_id", "idempotency_key");
