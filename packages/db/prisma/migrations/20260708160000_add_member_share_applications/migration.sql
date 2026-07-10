CREATE TYPE "MemberShareApplicationStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

ALTER TYPE "MemberShareSourceType" ADD VALUE 'share_application';

CREATE TABLE "member_share_applications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "member_id" uuid NOT NULL,
  "requested_units" integer NOT NULL,
  "approved_units" integer,
  "unit_amount_snapshot" numeric(18, 2) NOT NULL,
  "share_value_snapshot" numeric(18, 2) NOT NULL,
  "status" "MemberShareApplicationStatus" NOT NULL DEFAULT 'pending',
  "notes" text,
  "review_notes" text,
  "requested_by_user_id" uuid,
  "reviewed_by_user_id" uuid,
  "reviewed_at" timestamptz(6),
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "member_share_applications_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "member_share_applications_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "member_share_applications_requested_units_positive"
    CHECK ("requested_units" > 0),
  CONSTRAINT "member_share_applications_approved_units_positive"
    CHECK ("approved_units" IS NULL OR "approved_units" > 0),
  CONSTRAINT "member_share_applications_unit_amount_positive"
    CHECK ("unit_amount_snapshot" > 0),
  CONSTRAINT "member_share_applications_share_value_non_negative"
    CHECK ("share_value_snapshot" >= 0)
);

CREATE INDEX "member_share_applications_tenant_status_created_idx"
  ON "member_share_applications" ("tenant_id", "status", "created_at");

CREATE INDEX "member_share_applications_tenant_member_status_idx"
  ON "member_share_applications" ("tenant_id", "member_id", "status");
