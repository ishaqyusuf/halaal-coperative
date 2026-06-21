CREATE TYPE "InitialMigrationStatus" AS ENUM (
  'not_started',
  'historical_setup_in_progress',
  'member_migration_in_progress',
  'migration_review',
  'finalized',
  'live_operations'
);

ALTER TABLE "tenants"
ADD COLUMN "initial_migration_status" "InitialMigrationStatus" NOT NULL DEFAULT 'not_started',
ADD COLUMN "migration_finalized_at" TIMESTAMPTZ(6),
ADD COLUMN "migration_finalized_by_user_id" UUID,
ADD COLUMN "migration_emergency_unlock_until" TIMESTAMPTZ(6),
ADD COLUMN "migration_emergency_unlocked_by_user_id" UUID,
ADD COLUMN "migration_emergency_unlock_reason" TEXT;

CREATE INDEX "tenants_initial_migration_status_idx"
ON "tenants"("initial_migration_status");
