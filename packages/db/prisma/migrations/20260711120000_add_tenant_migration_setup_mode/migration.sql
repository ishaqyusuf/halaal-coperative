CREATE TYPE "TenantMigrationSetupMode" AS ENUM ('historical_backfill', 'brought_forward');

ALTER TABLE "tenant_policies"
  ADD COLUMN "migration_setup_mode" "TenantMigrationSetupMode" NOT NULL DEFAULT 'historical_backfill';
