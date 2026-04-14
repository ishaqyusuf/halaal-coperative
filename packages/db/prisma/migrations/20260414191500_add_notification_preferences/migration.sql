CREATE TABLE "notification_preferences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "role" TEXT,
  "notification_type" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'email',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_preferences_tenant_role_type_channel_key"
ON "notification_preferences" ("tenant_id", "role", "notification_type", "channel");

CREATE INDEX "notification_preferences_tenant_role_idx"
ON "notification_preferences" ("tenant_id", "role");

ALTER TABLE "notification_preferences"
ADD CONSTRAINT "notification_preferences_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
