-- DropForeignKey
ALTER TABLE "dashboard_evidence_uploads" DROP CONSTRAINT "dashboard_evidence_uploads_tenant_id_fkey";

-- AddForeignKey
ALTER TABLE "dashboard_evidence_uploads" ADD CONSTRAINT "dashboard_evidence_uploads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
