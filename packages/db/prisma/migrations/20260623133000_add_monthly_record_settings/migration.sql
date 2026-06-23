CREATE TABLE "monthly_record_settings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "auto_generate_enabled" BOOLEAN NOT NULL DEFAULT true,
  "generation_day_of_month" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "monthly_record_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "monthly_record_settings_tenant_id_key"
  ON "monthly_record_settings"("tenant_id");

ALTER TABLE "monthly_record_settings"
  ADD CONSTRAINT "monthly_record_settings_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
