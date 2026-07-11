CREATE TYPE "ChargeWorkflow" AS ENUM (
  'commitment_collection',
  'loan_request',
  'loan',
  'procurement_request',
  'food_purchase_application',
  'project_financing_request'
);

CREATE TYPE "ChargeApplicabilityTrigger" AS ENUM (
  'monthly_collection',
  'submission',
  'approval',
  'manual'
);

CREATE TYPE "ChargeCollectionMode" AS ENUM (
  'deduct_from_savings',
  'pay_separately'
);

CREATE TABLE "charge_applicability" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "charge_definition_id" UUID NOT NULL,
  "workflow" "ChargeWorkflow" NOT NULL,
  "trigger" "ChargeApplicabilityTrigger" NOT NULL,
  "collection_mode" "ChargeCollectionMode" NOT NULL DEFAULT 'deduct_from_savings',
  "is_required" BOOLEAN NOT NULL DEFAULT true,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "charge_applicability_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "charge_applicability"
  ADD CONSTRAINT "charge_applicability_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "charge_applicability"
  ADD CONSTRAINT "charge_applicability_charge_definition_id_fkey"
  FOREIGN KEY ("charge_definition_id") REFERENCES "charge_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "charge_applicability_definition_workflow_trigger_key"
  ON "charge_applicability"("charge_definition_id", "workflow", "trigger");

CREATE INDEX "charge_applicability_tenant_workflow_trigger_idx"
  ON "charge_applicability"("tenant_id", "workflow", "trigger", "is_active");

ALTER TABLE "charge_applications"
  ADD COLUMN "charge_applicability_id" UUID,
  ADD COLUMN "procurement_request_id" UUID,
  ADD COLUMN "food_purchase_application_id" UUID,
  ADD COLUMN "project_financing_request_id" UUID,
  ADD COLUMN "collection_mode" "ChargeCollectionMode" NOT NULL DEFAULT 'deduct_from_savings';

ALTER TABLE "charge_applications"
  ADD CONSTRAINT "charge_applications_charge_applicability_id_fkey"
  FOREIGN KEY ("charge_applicability_id") REFERENCES "charge_applicability"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "charge_applications"
  ADD CONSTRAINT "charge_applications_procurement_request_id_fkey"
  FOREIGN KEY ("procurement_request_id") REFERENCES "procurement_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "charge_applications"
  ADD CONSTRAINT "charge_applications_food_purchase_application_id_fkey"
  FOREIGN KEY ("food_purchase_application_id") REFERENCES "food_purchase_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "charge_applications"
  ADD CONSTRAINT "charge_applications_project_financing_request_id_fkey"
  FOREIGN KEY ("project_financing_request_id") REFERENCES "project_financing_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "charge_applications_tenant_procurement_idx"
  ON "charge_applications"("tenant_id", "procurement_request_id");

CREATE INDEX "charge_applications_tenant_food_purchase_idx"
  ON "charge_applications"("tenant_id", "food_purchase_application_id");

CREATE INDEX "charge_applications_tenant_project_financing_idx"
  ON "charge_applications"("tenant_id", "project_financing_request_id");

INSERT INTO "charge_applicability" (
  "tenant_id",
  "charge_definition_id",
  "workflow",
  "trigger",
  "collection_mode",
  "is_required",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT
  "tenant_id",
  "id",
  'commitment_collection'::"ChargeWorkflow",
  'monthly_collection'::"ChargeApplicabilityTrigger",
  'deduct_from_savings'::"ChargeCollectionMode",
  true,
  "is_active",
  "created_at",
  "updated_at"
FROM "charge_definitions"
WHERE "applies_to_members" = true
ON CONFLICT ("charge_definition_id", "workflow", "trigger") DO NOTHING;

INSERT INTO "charge_applicability" (
  "tenant_id",
  "charge_definition_id",
  "workflow",
  "trigger",
  "collection_mode",
  "is_required",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT
  "tenant_id",
  "id",
  'loan_request'::"ChargeWorkflow",
  'submission'::"ChargeApplicabilityTrigger",
  'deduct_from_savings'::"ChargeCollectionMode",
  true,
  "is_active",
  "created_at",
  "updated_at"
FROM "charge_definitions"
WHERE "applies_to_loan_requests" = true OR "purpose" = 'loan_fee'
ON CONFLICT ("charge_definition_id", "workflow", "trigger") DO NOTHING;

INSERT INTO "charge_applicability" (
  "tenant_id",
  "charge_definition_id",
  "workflow",
  "trigger",
  "collection_mode",
  "is_required",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT
  "tenant_id",
  "id",
  'loan'::"ChargeWorkflow",
  'manual'::"ChargeApplicabilityTrigger",
  'deduct_from_savings'::"ChargeCollectionMode",
  true,
  "is_active",
  "created_at",
  "updated_at"
FROM "charge_definitions"
WHERE "applies_to_loans" = true
ON CONFLICT ("charge_definition_id", "workflow", "trigger") DO NOTHING;
