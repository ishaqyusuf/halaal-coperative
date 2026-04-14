ALTER TABLE "tenant_domains"
ADD COLUMN "verification_details" JSONB;

ALTER TABLE "members"
ADD COLUMN "kyc_document_type" TEXT,
ADD COLUMN "kyc_document_uploaded_at" TIMESTAMPTZ(6),
ADD COLUMN "kyc_review_notes" TEXT;

CREATE TABLE "collection_follow_ups" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "repayment_schedule_item_id" UUID NOT NULL,
  "loan_id" UUID NOT NULL,
  "member_id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "status" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "next_action_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

  CONSTRAINT "collection_follow_ups_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "collection_follow_ups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "collection_follow_ups_repayment_schedule_item_id_fkey" FOREIGN KEY ("repayment_schedule_item_id") REFERENCES "repayment_schedule_items"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "collection_follow_ups_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "collection_follow_ups_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "collection_follow_ups_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "collection_follow_ups_tenant_created_at_idx" ON "collection_follow_ups"("tenant_id", "created_at");
CREATE INDEX "collection_follow_ups_tenant_status_idx" ON "collection_follow_ups"("tenant_id", "status");
CREATE INDEX "collection_follow_ups_schedule_created_at_idx" ON "collection_follow_ups"("repayment_schedule_item_id", "created_at");
