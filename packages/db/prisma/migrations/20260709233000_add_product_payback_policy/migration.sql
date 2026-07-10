ALTER TABLE "tenant_policies"
ADD COLUMN "procurement_maximum_payback_months" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN "procurement_allows_commitment_reduction_during_payback" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "food_purchase_maximum_payback_months" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "food_purchase_allows_commitment_reduction_during_payback" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "tenant_policies"
ADD CONSTRAINT "tenant_policies_procurement_max_payback_positive"
CHECK ("procurement_maximum_payback_months" > 0);

ALTER TABLE "tenant_policies"
ADD CONSTRAINT "tenant_policies_food_purchase_max_payback_positive"
CHECK ("food_purchase_maximum_payback_months" > 0);

ALTER TABLE "procurement_requests"
ADD COLUMN "policy_maximum_payback_months" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN "allows_commitment_reduction_during_payback" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "procurement_requests"
ADD CONSTRAINT "procurement_requests_policy_max_payback_positive"
CHECK ("policy_maximum_payback_months" > 0);

ALTER TABLE "food_purchase_applications"
ADD COLUMN "requested_payback_months" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "approved_payback_months" INTEGER,
ADD COLUMN "policy_maximum_payback_months" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "allows_commitment_reduction_during_payback" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "food_purchase_applications"
ADD CONSTRAINT "food_purchase_applications_requested_payback_positive"
CHECK ("requested_payback_months" > 0);

ALTER TABLE "food_purchase_applications"
ADD CONSTRAINT "food_purchase_applications_approved_payback_positive"
CHECK ("approved_payback_months" IS NULL OR "approved_payback_months" > 0);

ALTER TABLE "food_purchase_applications"
ADD CONSTRAINT "food_purchase_applications_policy_max_payback_positive"
CHECK ("policy_maximum_payback_months" > 0);
