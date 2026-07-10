ALTER TABLE "tenant_policies"
  ADD COLUMN "share_unit_amount" DECIMAL(18, 2) NOT NULL DEFAULT 10000,
  ADD COLUMN "compulsory_share_units" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "maximum_share_units" INTEGER NOT NULL DEFAULT 20;

ALTER TABLE "tenant_policies"
  ADD CONSTRAINT "tenant_policies_share_unit_amount_positive"
  CHECK ("share_unit_amount" > 0);

ALTER TABLE "tenant_policies"
  ADD CONSTRAINT "tenant_policies_compulsory_share_units_non_negative"
  CHECK ("compulsory_share_units" >= 0);

ALTER TABLE "tenant_policies"
  ADD CONSTRAINT "tenant_policies_maximum_share_units_positive"
  CHECK ("maximum_share_units" > 0);

ALTER TABLE "tenant_policies"
  ADD CONSTRAINT "tenant_policies_maximum_share_units_gte_compulsory"
  CHECK ("maximum_share_units" >= "compulsory_share_units");
