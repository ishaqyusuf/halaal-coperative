CREATE TYPE "MemberSignupAccessMode" AS ENUM (
  'in_office',
  'public'
);

ALTER TABLE "tenant_policies"
ADD COLUMN "member_signup_access_mode" "MemberSignupAccessMode" NOT NULL DEFAULT 'in_office';

ALTER TABLE "member_onboarding_requests"
ADD COLUMN "signup_link_id" UUID;

CREATE TABLE "member_signup_links" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "notes" TEXT,
  "token_version" INTEGER NOT NULL DEFAULT 1,
  "token_issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMPTZ(6),
  "max_signups" INTEGER,
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "last_used_at" TIMESTAMPTZ(6),
  "created_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "member_signup_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "member_signup_links_tenant_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "member_signup_links_created_by_user_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "member_onboarding_requests_tenant_signup_link_idx" ON "member_onboarding_requests"("tenant_id", "signup_link_id");
CREATE INDEX "member_signup_links_tenant_enabled_expiry_idx" ON "member_signup_links"("tenant_id", "is_enabled", "expires_at");
CREATE INDEX "member_signup_links_tenant_created_at_idx" ON "member_signup_links"("tenant_id", "created_at");

ALTER TABLE "member_onboarding_requests"
ADD CONSTRAINT "member_onboarding_requests_signup_link_fkey" FOREIGN KEY ("signup_link_id") REFERENCES "member_signup_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;
