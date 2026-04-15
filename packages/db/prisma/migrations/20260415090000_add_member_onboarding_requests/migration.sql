CREATE TYPE "MemberOnboardingStatus" AS ENUM (
  'pending_email_verification',
  'pending_approval',
  'approved',
  'rejected',
  'cancelled'
);

CREATE TABLE "member_onboarding_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "member_number" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone_number" TEXT,
  "status" "MemberOnboardingStatus" NOT NULL DEFAULT 'pending_email_verification',
  "email_verified_at" TIMESTAMPTZ(6),
  "approved_at" TIMESTAMPTZ(6),
  "approved_by_user_id" UUID,
  "rejected_at" TIMESTAMPTZ(6),
  "rejection_reason" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "member_onboarding_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "member_onboarding_requests_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "member_onboarding_requests_user_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "member_onboarding_requests_user_id_key" ON "member_onboarding_requests"("user_id");
CREATE UNIQUE INDEX "member_onboarding_requests_tenant_email_key" ON "member_onboarding_requests"("tenant_id", "email");
CREATE UNIQUE INDEX "member_onboarding_requests_tenant_member_number_key" ON "member_onboarding_requests"("tenant_id", "member_number");
CREATE INDEX "member_onboarding_requests_tenant_status_created_at_idx" ON "member_onboarding_requests"("tenant_id", "status", "created_at");
CREATE INDEX "member_onboarding_requests_tenant_verified_at_idx" ON "member_onboarding_requests"("tenant_id", "email_verified_at");
