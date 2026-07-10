-- AlterTable
ALTER TABLE "tenant_policies"
ADD COLUMN "special_savings_counts_for_eligibility" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "strict_commitment_during_financing" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "active_financing_blocks_emergency" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "active_financing_blocks_procurement" BOOLEAN NOT NULL DEFAULT true;
