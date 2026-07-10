CREATE TYPE "ShareConfigurationMode" AS ENUM ('monthly_history', 'unit_based');

ALTER TABLE "tenant_policies"
  ADD COLUMN "share_configuration_mode" "ShareConfigurationMode" NOT NULL DEFAULT 'monthly_history';
