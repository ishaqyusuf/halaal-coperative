CREATE TYPE "TenantServiceAccessMode" AS ENUM (
  'disabled',
  'office_only',
  'member_self_service',
  'read_only'
);

CREATE TYPE "TenantServiceKey" AS ENUM (
  'payment_receipts',
  'procurement',
  'food_purchase',
  'support_cases',
  'collection_sources',
  'collection_source_batch_posting'
);

ALTER TABLE "tenant_policies"
ADD COLUMN "procurement_maximum_active_obligations_per_member" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "food_purchase_requires_open_cycle" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "food_purchase_maximum_active_obligations_per_member" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "tenant_policies"
ADD CONSTRAINT "tenant_policies_procurement_active_obligation_cap_positive"
CHECK ("procurement_maximum_active_obligations_per_member" > 0);

ALTER TABLE "tenant_policies"
ADD CONSTRAINT "tenant_policies_food_purchase_active_obligation_cap_positive"
CHECK ("food_purchase_maximum_active_obligations_per_member" > 0);

CREATE TABLE "tenant_operation_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "reviewed_at" TIMESTAMPTZ(6),
  "reviewed_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "tenant_operation_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_service_settings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "operation_profile_id" UUID NOT NULL,
  "service_key" "TenantServiceKey" NOT NULL,
  "access_mode" "TenantServiceAccessMode" NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "tenant_service_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_operation_profiles_tenant_id_key"
ON "tenant_operation_profiles"("tenant_id");

CREATE UNIQUE INDEX "tenant_service_settings_tenant_service_key"
ON "tenant_service_settings"("tenant_id", "service_key");

CREATE INDEX "tenant_service_settings_tenant_access_mode_idx"
ON "tenant_service_settings"("tenant_id", "access_mode");

ALTER TABLE "tenant_operation_profiles"
ADD CONSTRAINT "tenant_operation_profiles_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_operation_profiles"
ADD CONSTRAINT "tenant_operation_profiles_reviewed_by_user_id_fkey"
FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tenant_service_settings"
ADD CONSTRAINT "tenant_service_settings_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_service_settings"
ADD CONSTRAINT "tenant_service_settings_operation_profile_id_fkey"
FOREIGN KEY ("operation_profile_id") REFERENCES "tenant_operation_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
