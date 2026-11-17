-- CreateIndex
CREATE INDEX "contributions_tenant_posted_at_id_idx" ON "contributions"("tenant_id", "posted_at", "id");

-- CreateIndex
CREATE INDEX "members_tenant_full_name_id_idx" ON "members"("tenant_id", "full_name", "id");
