CREATE TYPE "ChargeFrequency" AS ENUM ('recurring_monthly', 'per_contribution', 'one_time', 'manual');
CREATE TYPE "ChargeValueType" AS ENUM ('fixed_amount', 'percentage');

ALTER TABLE "charge_definitions"
  ADD COLUMN "charge_frequency" "ChargeFrequency" NOT NULL DEFAULT 'recurring_monthly',
  ADD COLUMN "charge_value_type" "ChargeValueType" NOT NULL DEFAULT 'fixed_amount';

ALTER TABLE "charge_definition_versions"
  ADD COLUMN "charge_value_type" "ChargeValueType" NOT NULL DEFAULT 'fixed_amount';

UPDATE "charge_definitions"
SET "charge_value_type" = CASE
  WHEN "kind" = 'percentage' THEN 'percentage'::"ChargeValueType"
  ELSE 'fixed_amount'::"ChargeValueType"
END;

UPDATE "charge_definition_versions"
SET "charge_value_type" = CASE
  WHEN "kind" = 'percentage' THEN 'percentage'::"ChargeValueType"
  ELSE 'fixed_amount'::"ChargeValueType"
END;
