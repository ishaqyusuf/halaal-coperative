-- AlterTable
ALTER TABLE "collection_follow_ups" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "import_batches" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "loan_requests" ALTER COLUMN "requested_term_months" DROP DEFAULT,
ALTER COLUMN "estimated_monthly_servicing" DROP DEFAULT;

-- AlterTable
ALTER TABLE "loans" ALTER COLUMN "term_months" DROP DEFAULT,
ALTER COLUMN "estimated_monthly_servicing" DROP DEFAULT;

-- AlterTable
ALTER TABLE IF EXISTS "member_documents" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notification_preferences" ALTER COLUMN "updated_at" DROP DEFAULT;
