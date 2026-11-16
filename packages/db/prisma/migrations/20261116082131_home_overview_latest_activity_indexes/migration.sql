-- DropIndex
DROP INDEX "contributions_tenant_status_idx";

-- CreateIndex
CREATE INDEX "contributions_tenant_status_posted_at_idx" ON "contributions"("tenant_id", "status", "posted_at");

-- CreateIndex
CREATE INDEX "repayments_tenant_status_paid_at_idx" ON "repayments"("tenant_id", "status", "paid_at");
