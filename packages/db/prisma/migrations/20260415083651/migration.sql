-- AlterTable
ALTER TABLE "import_batches" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "member_documents" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "member_onboarding_requests" ALTER COLUMN "updated_at" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "member_onboarding_requests" RENAME CONSTRAINT "member_onboarding_requests_tenant_fkey" TO "member_onboarding_requests_tenant_id_fkey";

-- RenameForeignKey
ALTER TABLE "member_onboarding_requests" RENAME CONSTRAINT "member_onboarding_requests_user_fkey" TO "member_onboarding_requests_user_id_fkey";
