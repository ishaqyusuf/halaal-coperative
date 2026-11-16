-- CreateIndex
CREATE INDEX "audit_logs_tenant_action_occurred_at_idx" ON "audit_logs"("tenant_id", "action", "occurred_at");
