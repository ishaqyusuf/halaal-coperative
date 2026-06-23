ALTER TABLE "migration_backfill_adjustments"
ADD COLUMN "row_status" VARCHAR(32);

CREATE TABLE "member_activity_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "effective_month" DATE NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "reason" VARCHAR(120),
    "notes" TEXT,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_activity_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "member_activity_events_member_month_key"
ON "member_activity_events"("tenant_id", "member_id", "effective_month");

CREATE INDEX "member_activity_events_tenant_member_month_idx"
ON "member_activity_events"("tenant_id", "member_id", "effective_month");

CREATE INDEX "member_activity_events_tenant_status_idx"
ON "member_activity_events"("tenant_id", "status");

ALTER TABLE "member_activity_events"
ADD CONSTRAINT "member_activity_events_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "member_activity_events"
ADD CONSTRAINT "member_activity_events_member_id_fkey"
FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
