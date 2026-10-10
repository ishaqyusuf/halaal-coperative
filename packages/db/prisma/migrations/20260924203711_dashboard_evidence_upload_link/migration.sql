-- AlterTable
ALTER TABLE "dashboard_evidence_uploads" ADD COLUMN     "linked_at" TIMESTAMPTZ(6),
ADD COLUMN     "linked_entity_id" UUID,
ADD COLUMN     "linked_entity_type" VARCHAR(40);

-- CreateIndex
CREATE INDEX "dashboard_evidence_uploads_tenant_link_idx" ON "dashboard_evidence_uploads"("tenant_id", "linked_entity_type", "linked_entity_id");
