-- CreateEnum
CREATE TYPE "DashboardEvidenceUploadStatus" AS ENUM ('pending', 'uploaded', 'deleted');

-- CreateTable
CREATE TABLE "dashboard_evidence_uploads" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "uploader_user_id" UUID,
    "purpose" VARCHAR(40) NOT NULL,
    "original_name" VARCHAR(120) NOT NULL,
    "content_type" VARCHAR(80) NOT NULL,
    "declared_size" INTEGER NOT NULL,
    "stored_size" INTEGER,
    "status" "DashboardEvidenceUploadStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "dashboard_evidence_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dashboard_evidence_uploads_tenant_status_created_idx" ON "dashboard_evidence_uploads"("tenant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "dashboard_evidence_uploads_uploader_created_idx" ON "dashboard_evidence_uploads"("uploader_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "dashboard_evidence_uploads" ADD CONSTRAINT "dashboard_evidence_uploads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_evidence_uploads" ADD CONSTRAINT "dashboard_evidence_uploads_uploader_user_id_fkey" FOREIGN KEY ("uploader_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
