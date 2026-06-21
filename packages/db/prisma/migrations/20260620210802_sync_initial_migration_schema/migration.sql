-- DropIndex
DROP INDEX "tenants_initial_migration_status_idx";

-- RenameForeignKey
ALTER TABLE "applied_backfill_months" RENAME CONSTRAINT "applied_backfill_months_batch_fkey" TO "applied_backfill_months_batch_id_fkey";

-- RenameForeignKey
ALTER TABLE "applied_backfill_months" RENAME CONSTRAINT "applied_backfill_months_member_fkey" TO "applied_backfill_months_member_id_fkey";

-- RenameForeignKey
ALTER TABLE "applied_backfill_months" RENAME CONSTRAINT "applied_backfill_months_tenant_fkey" TO "applied_backfill_months_tenant_id_fkey";
