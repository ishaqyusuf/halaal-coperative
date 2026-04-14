ALTER TABLE "collection_follow_ups"
  ADD COLUMN "assigned_to_user_id" UUID,
  ADD COLUMN "case_stage" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN "resolution_status" TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN "promise_to_pay_at" TIMESTAMPTZ(6);

ALTER TABLE "collection_follow_ups"
  ADD CONSTRAINT "collection_follow_ups_assigned_to_user_id_fkey"
  FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "collection_follow_ups_tenant_stage_resolution_idx"
  ON "collection_follow_ups"("tenant_id", "case_stage", "resolution_status");

CREATE TABLE "member_documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "member_id" UUID NOT NULL,
  "document_type" TEXT NOT NULL,
  "document_url" TEXT NOT NULL,
  "review_status" TEXT NOT NULL DEFAULT 'pending',
  "review_notes" TEXT,
  "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "reviewed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "member_documents_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "member_documents"
  ADD CONSTRAINT "member_documents_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "member_documents"
  ADD CONSTRAINT "member_documents_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "members"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "member_documents_tenant_member_review_status_idx"
  ON "member_documents"("tenant_id", "member_id", "review_status");

CREATE INDEX "member_documents_tenant_uploaded_at_idx"
  ON "member_documents"("tenant_id", "uploaded_at");
