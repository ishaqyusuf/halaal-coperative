CREATE TYPE "ShareValueType" AS ENUM ('fixed_amount', 'percentage');
CREATE TYPE "ShareBasis" AS ENUM ('after_charge_deductions');

ALTER TABLE "tenant_share_structure_versions"
  ADD COLUMN "value_type" "ShareValueType" NOT NULL DEFAULT 'fixed_amount',
  ADD COLUMN "basis" "ShareBasis" NOT NULL DEFAULT 'after_charge_deductions';

ALTER TABLE "member_share_overrides"
  ADD COLUMN "value_type" "ShareValueType" NOT NULL DEFAULT 'fixed_amount',
  ADD COLUMN "basis" "ShareBasis" NOT NULL DEFAULT 'after_charge_deductions';
