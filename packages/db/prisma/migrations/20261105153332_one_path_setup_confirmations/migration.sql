-- AlterTable
ALTER TABLE "tenant_policies" ADD COLUMN     "migration_setup_confirmed_at" TIMESTAMPTZ(6),
ADD COLUMN     "share_policy_confirmed_at" TIMESTAMPTZ(6);
